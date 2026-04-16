import mongoose from 'mongoose';

import { CategoryEntity } from '../models/category.model';
import { TransactionEntity, TransactionType } from '../models/transaction.model';

type TransactionInput = {
  type: TransactionType;
  amount: number;
  categoryId?: string;
  date: Date;
  note?: string;
};

type TransactionUpdateInput = {
  type?: TransactionType;
  amount?: number;
  categoryId?: string | null;
  date?: Date;
  note?: string;
};

export class TransactionService {
  async getTransactions(userId: string) {
    return TransactionEntity.find({ userId }).sort({ date: -1 }).populate('categoryId').lean();
  }

  private async validateCategoryAccess(userId: string, type: TransactionType, categoryId?: string | null): Promise<void> {
    if (categoryId === undefined || categoryId === null || categoryId === '') {
      return;
    }

    const category = await CategoryEntity.findOne({
      _id: categoryId,
      $or: [{ isDefault: true }, { userId }],
    }).lean();

    if (!category) {
      throw new Error('Invalid category.');
    }

    if (category.type !== type) {
      throw new Error('Category type does not match transaction type.');
    }
  }

  async createTransaction(userId: string, data: TransactionInput) {
    await this.validateCategoryAccess(userId, data.type, data.categoryId);

    const transaction = new TransactionEntity({
      userId,
      ...data,
    });
    await transaction.save();
    return transaction;
  }

  async createBulkTransactions(userId: string, transactions: any[]) {
    // Basic validation and formatting
    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      userId: new mongoose.Types.ObjectId(userId),
      categoryId: tx.categoryId ? new mongoose.Types.ObjectId(String(tx.categoryId)) : null
    }));

    return TransactionEntity.insertMany(formattedTransactions);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    data: TransactionUpdateInput,
  ) {
    const transaction = await TransactionEntity.findOne({ _id: transactionId, userId });
    if (!transaction) {
      throw new Error('Transaction not found or not authorized.');
    }

    const nextType = data.type ?? transaction.type;
    const nextCategoryId =
      data.categoryId === undefined ? transaction.categoryId?.toString() : data.categoryId;

    await this.validateCategoryAccess(userId, nextType, nextCategoryId);

    if (data.type !== undefined) {
      transaction.type = data.type;
    }

    if (data.amount !== undefined) {
      transaction.amount = data.amount;
    }

    if (data.date !== undefined) {
      transaction.date = data.date;
    }

    if (data.note !== undefined) {
      transaction.note = data.note;
    }

    if (data.categoryId !== undefined) {
      transaction.categoryId = data.categoryId ? new mongoose.Types.ObjectId(data.categoryId) : undefined;
    }

    await transaction.save();
    return transaction;
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await TransactionEntity.findOneAndDelete({ _id: transactionId, userId });
    if (!transaction) {
      throw new Error('Transaction not found or not authorized.');
    }
    return transaction;
  }
}

export const transactionService = new TransactionService();
