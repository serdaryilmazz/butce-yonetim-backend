import { CategoryEntity } from '../models/category.model';
import { RecurringTransactionEntity } from '../models/recurring-transaction.model';
import { TransactionEntity } from '../models/transaction.model';
import { logger } from '../utils/logger';

export class RecurringService {
  private getFirstDayOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private getPeriodKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  async processDueRecurringTransactions(now: Date = new Date()): Promise<void> {
    try {
      const firstDayOfCurrentMonth = this.getFirstDayOfMonth(now);
      const recurringPeriodKey = this.getPeriodKey(now);

      const dueTransactions = await RecurringTransactionEntity.find({
        $or: [
          { lastExecutedDate: { $exists: false } },
          { lastExecutedDate: null },
          { lastExecutedDate: { $lt: firstDayOfCurrentMonth } },
        ],
      });

      if (dueTransactions.length === 0) return;

      for (const rec of dueTransactions) {
        const claimedRecurring = await RecurringTransactionEntity.findOneAndUpdate(
          {
            _id: rec._id,
            $or: [
              { lastExecutedDate: { $exists: false } },
              { lastExecutedDate: null },
              { lastExecutedDate: { $lt: firstDayOfCurrentMonth } },
            ],
          },
          { $set: { lastExecutedDate: now } },
          { new: true },
        );

        if (!claimedRecurring) {
          continue;
        }

        let type = 'expense';
        if (claimedRecurring.categoryId) {
          const cat = await CategoryEntity.findById(claimedRecurring.categoryId).lean();
          if (cat) type = cat.type;
        }

        await TransactionEntity.updateOne(
          {
            sourceRecurringId: claimedRecurring._id,
            recurringPeriodKey,
          },
          {
            $setOnInsert: {
              userId: claimedRecurring.userId,
              type,
              amount: claimedRecurring.amount,
              categoryId: claimedRecurring.categoryId,
              date: now,
              note: 'Auto-generated recurring transaction',
              sourceRecurringId: claimedRecurring._id,
              recurringPeriodKey,
            },
          },
          { upsert: true },
        );
      }
    } catch (error) {
      logger.error('Failed to process recurring transactions.', error);
    }
  }
}

export const recurringService = new RecurringService();
