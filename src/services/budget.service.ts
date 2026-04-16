import mongoose from 'mongoose';

import { CategoryEntity } from '../models/category.model';
import { BudgetEntity } from '../models/budget.model';
import { TransactionEntity } from '../models/transaction.model';

type MonthRange = {
  start: Date;
  end: Date;
};

export class BudgetService {
  private getCurrentMonthRange(referenceDate: Date = new Date()): MonthRange {
    const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1));

    return { start, end };
  }

  async getBudgets(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { start, end } = this.getCurrentMonthRange();

    const [budgets, monthlySpending] = await Promise.all([
      BudgetEntity.find({ userId }).populate('categoryId').lean(),
      TransactionEntity.aggregate<{ _id: mongoose.Types.ObjectId | null; total: number }>([
        {
          $match: {
            userId: userObjectId,
            type: 'expense',
            date: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const spendingByCategory = new Map<string, number>();
    let totalSpent = 0;

    for (const item of monthlySpending) {
      totalSpent += item.total;
      if (item._id) {
        spendingByCategory.set(item._id.toString(), item.total);
      }
    }

    return budgets.map((budget) => {
      const categoryId =
        budget.categoryId && typeof budget.categoryId === 'object' && '_id' in budget.categoryId
          ? budget.categoryId._id.toString()
          : null;

      const spent = categoryId ? spendingByCategory.get(categoryId) ?? 0 : totalSpent;

      return {
        ...budget,
        spent,
        isOverLimit: spent > budget.limit,
      };
    });
  }

  async createBudget(userId: string, data: { categoryId?: string; limit: number }) {
    if (data.categoryId) {
      const category = await CategoryEntity.findOne({
        _id: data.categoryId,
        type: 'expense',
        $or: [{ isDefault: true }, { userId }],
      }).lean();

      if (!category) {
        throw new Error('Invalid expense category.');
      }
    }

    const filter: { userId: string; categoryId?: string | { $exists: false } } = { userId };
    if (data.categoryId) {
      filter.categoryId = data.categoryId;
    } else {
      filter.categoryId = { $exists: false };
    }

    let budget = await BudgetEntity.findOne(filter);
    if (budget) {
      budget.limit = data.limit;
      await budget.save();
    } else {
      budget = new BudgetEntity({
        userId,
        ...data,
      });
      await budget.save();
    }

    return budget;
  }
}

export const budgetService = new BudgetService();
