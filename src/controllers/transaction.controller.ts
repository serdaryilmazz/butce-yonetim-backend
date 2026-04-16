import { Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { isBadRequestError, isValidObjectId } from '../utils/validation';

type TransactionUpdateBody = Partial<{
  type: 'income' | 'expense';
  amount: number;
  categoryId: string | null;
  date: string;
  note: string;
}>;

class TransactionController {
  async getTransactions(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }
      const transactions = await transactionService.getTransactions(userId);
      response.status(200).json({ success: true, data: transactions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch transactions.';
      response.status(500).json({ success: false, data: { message } });
    }
  }

  async createTransaction(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const { type, amount, categoryId, date, note } = request.body;
      if (!type || amount === undefined || !date) {
        response.status(400).json({ success: false, data: { message: 'Type, amount, and date are required.' } });
        return;
      }

      if (type !== 'income' && type !== 'expense') {
        response.status(400).json({ success: false, data: { message: 'Invalid transaction type.' } });
        return;
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        response.status(400).json({ success: false, data: { message: 'Invalid amount.' } });
        return;
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        response.status(400).json({ success: false, data: { message: 'Invalid date format.' } });
        return;
      }

      if (categoryId !== undefined && categoryId !== null && categoryId !== '' && !isValidObjectId(String(categoryId))) {
        response.status(400).json({ success: false, data: { message: 'Invalid category id.' } });
        return;
      }

      const transaction = await transactionService.createTransaction(userId, {
        type,
        amount: parsedAmount,
        categoryId,
        date: parsedDate,
        note,
      });
      response.status(201).json({ success: true, data: transaction });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transaction.';
      const status =
        message === 'Invalid category.' || message === 'Category type does not match transaction type.'
          ? 400
          : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }

  async createBulkTransactions(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const { transactions } = request.body;
      if (!Array.isArray(transactions)) {
        response.status(400).json({ success: false, data: { message: 'Transactions array is required.' } });
        return;
      }

      const data = await transactionService.createBulkTransactions(userId, transactions);
      response.status(201).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: 'Failed to create bulk transactions.' } });
    }
  }

  async updateTransaction(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const transactionId = request.params.id as string;
      if (!isValidObjectId(transactionId)) {
        response.status(400).json({ success: false, data: { message: 'Invalid transaction id.' } });
        return;
      }

      const body = request.body as TransactionUpdateBody;
      const data: {
        type?: 'income' | 'expense';
        amount?: number;
        categoryId?: string | null;
        date?: Date;
        note?: string;
      } = {};

      if (body.type !== undefined) {
        if (body.type !== 'income' && body.type !== 'expense') {
          response.status(400).json({ success: false, data: { message: 'Invalid transaction type.' } });
          return;
        }

        data.type = body.type;
      }

      if (body.amount !== undefined) {
        const parsedAmount = Number(body.amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          response.status(400).json({ success: false, data: { message: 'Invalid amount.' } });
          return;
        }

        data.amount = parsedAmount;
      }

      if (body.categoryId !== undefined) {
        if (body.categoryId !== null && body.categoryId !== '' && !isValidObjectId(body.categoryId)) {
          response.status(400).json({ success: false, data: { message: 'Invalid category id.' } });
          return;
        }

        data.categoryId = body.categoryId;
      }

      if (body.date !== undefined) {
        const parsedDate = new Date(body.date);
        if (isNaN(parsedDate.getTime())) {
          response.status(400).json({ success: false, data: { message: 'Invalid date format.' } });
          return;
        }

        data.date = parsedDate;
      }

      if (body.note !== undefined) {
        data.note = body.note;
      }

      const transaction = await transactionService.updateTransaction(userId, transactionId, data);
      response.status(200).json({ success: true, data: transaction });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update transaction.';
      const status =
        message === 'Transaction not found or not authorized.'
          ? 404
          : isBadRequestError(error)
            ? 400
            : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }

  async deleteTransaction(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const transactionId = request.params.id as string;
      if (!isValidObjectId(transactionId)) {
        response.status(400).json({ success: false, data: { message: 'Invalid transaction id.' } });
        return;
      }

      await transactionService.deleteTransaction(userId, transactionId);
      response.status(200).json({ success: true, data: { message: 'Transaction deleted successfully.' } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete transaction.';
      const status = message === 'Transaction not found or not authorized.' ? 404 : isBadRequestError(error) ? 400 : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }
}

export const transactionController = new TransactionController();
