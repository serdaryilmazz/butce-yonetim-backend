import mongoose from 'mongoose';

import { TransactionEntity } from '../models/transaction.model';

type MonthRange = {
  start: Date;
  end: Date;
};

export class AnalyticsService {
  private readonly timezone = 'UTC';

  private getMonthRange(referenceDate: Date): MonthRange {
    const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1));

    return { start, end };
  }

  private getCurrentMonthRange(): MonthRange {
    return this.getMonthRange(new Date());
  }

  private getPreviousMonthRange(): MonthRange {
    const now = new Date();
    return this.getMonthRange(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  }

  async getSummary(userId: string) {
    const result = await TransactionEntity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    for (const item of result) {
      if (item._id === 'income') totalIncome = item.totalAmount;
      if (item._id === 'expense') totalExpense = item.totalAmount;
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  async getTopCategory(userId: string) {
    const result = await TransactionEntity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense' } },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ]);

    if (result.length === 0) return null;
    return {
      category: result[0].category?.name || 'Uncategorized',
      amount: result[0].totalAmount,
    };
  }

  async getMonthlyComparison(userId: string) {
    const result = await TransactionEntity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            year: { $year: { date: '$date', timezone: this.timezone } },
            month: { $month: { date: '$date', timezone: this.timezone } },
            type: '$type',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthData: Record<string, { income: number; expense: number }> = {};
    for (const item of result) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthData[key]) monthData[key] = { income: 0, expense: 0 };
      if (item._id.type === 'income') monthData[key].income += item.totalAmount;
      if (item._id.type === 'expense') monthData[key].expense += item.totalAmount;
    }

    return monthData;
  }

  async getCategoryDistribution(userId: string) {
    const result = await TransactionEntity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense' } },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ]);

    return result.map((item) => ({
      categoryName: item.category?.name || 'Uncategorized',
      icon: item.category?.icon || '',
      amount: item.totalAmount,
    }));
  }

  async getDailyExpenses(userId: string) {
    const { start, end } = this.getCurrentMonthRange();

    const result = await TransactionEntity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: { date: '$date', timezone: this.timezone } },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((item) => ({
      day: item._id,
      amount: item.totalAmount,
    }));
  }

  async getAiInsights(userId: string): Promise<string[]> {
    const insights: string[] = [];
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const currentMonth = this.getCurrentMonthRange();
    const previousMonth = this.getPreviousMonthRange();

    const [lastMonthResult, currentMonthResult, currentMonthCategories] = await Promise.all([
      TransactionEntity.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            userId: userObjectId,
            type: 'expense',
            date: { $gte: previousMonth.start, $lt: previousMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      TransactionEntity.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            userId: userObjectId,
            type: 'expense',
            date: { $gte: currentMonth.start, $lt: currentMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      TransactionEntity.aggregate<{ categoryName: string; totalAmount: number }>([
        {
          $match: {
            userId: userObjectId,
            type: 'expense',
            date: { $gte: currentMonth.start, $lt: currentMonth.end },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            totalAmount: { $sum: '$amount' },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
            totalAmount: 1,
          },
        },
      ]),
    ]);

    const lastMonthTotal = lastMonthResult[0]?.total || 0;
    const currentMonthTotal = currentMonthResult[0]?.total || 0;
    const topCurrentMonthCategory = currentMonthCategories[0];

    if (lastMonthTotal > 0 && currentMonthTotal > lastMonthTotal) {
      const increaseRate = (((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1);
      insights.push(`Dikkat! Harcamalarınız geçen aya göre %${increaseRate} daha fazla.`);
    }

    if (topCurrentMonthCategory) {
      insights.push(
        `Bu ay en çok harcama yaptığınız kategori: ${topCurrentMonthCategory.categoryName} (${topCurrentMonthCategory.totalAmount} TL).`,
      );

      if (currentMonthTotal > 0 && topCurrentMonthCategory.totalAmount > currentMonthTotal * 0.2) {
        insights.push(
          `${topCurrentMonthCategory.categoryName} kategorisi aylık harcamalarınızın %20'sinden fazlasını oluşturuyor. Bu alanı gözden geçirebilirsiniz.`,
        );
      }
    }

    if (insights.length === 0) {
      insights.push('Harcama alışkanlıklarınız bu ay dengeli görünüyor. Tebrikler!');
    }

    return insights;
  }
}

export const analyticsService = new AnalyticsService();
