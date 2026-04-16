import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { CategoryEntity } from '../models/category.model';
import { RecurringTransactionEntity } from '../models/recurring-transaction.model';
import { TransactionEntity } from '../models/transaction.model';
import { recurringService } from '../services/recurring.service';

const originalFind = (RecurringTransactionEntity as any).find;
const originalFindOneAndUpdate = (RecurringTransactionEntity as any).findOneAndUpdate;
const originalFindById = (CategoryEntity as any).findById;
const originalUpdateOne = (TransactionEntity as any).updateOne;

afterEach(() => {
  (RecurringTransactionEntity as any).find = originalFind;
  (RecurringTransactionEntity as any).findOneAndUpdate = originalFindOneAndUpdate;
  (CategoryEntity as any).findById = originalFindById;
  (TransactionEntity as any).updateOne = originalUpdateOne;
});

test('processDueRecurringTransactions claims the recurring record before creating an upserted transaction', async () => {
  const now = new Date('2026-04-15T10:00:00.000Z');
  const recurringId = '660000000000000000000001';
  const categoryId = '660000000000000000000099';
  const userId = '660000000000000000000042';

  let capturedClaimQuery: unknown;
  let capturedUpdateFilter: unknown;
  let capturedUpdateOptions: unknown;

  (RecurringTransactionEntity as any).find = async () => [
    {
      _id: recurringId,
      userId,
      amount: 250,
      categoryId,
    },
  ];

  (RecurringTransactionEntity as any).findOneAndUpdate = async (query: unknown) => {
    capturedClaimQuery = query;
    return {
      _id: recurringId,
      userId,
      amount: 250,
      categoryId,
    };
  };

  (CategoryEntity as any).findById = () => ({
    lean: async () => ({ type: 'expense' }),
  });

  (TransactionEntity as any).updateOne = async (filter: unknown, _update: unknown, options: unknown) => {
    capturedUpdateFilter = filter;
    capturedUpdateOptions = options;
    return { acknowledged: true };
  };

  await recurringService.processDueRecurringTransactions(now);

  assert.deepEqual(capturedClaimQuery, {
    _id: recurringId,
    $or: [
      { lastExecutedDate: { $exists: false } },
      { lastExecutedDate: null },
      { lastExecutedDate: { $lt: new Date('2026-04-01T00:00:00.000Z') } },
    ],
  });

  assert.deepEqual(capturedUpdateFilter, {
    sourceRecurringId: recurringId,
    recurringPeriodKey: '2026-04',
  });
  assert.deepEqual(capturedUpdateOptions, { upsert: true });
});

test('processDueRecurringTransactions skips transaction creation when another worker already claimed the record', async () => {
  let updateCalled = false;

  (RecurringTransactionEntity as any).find = async () => [
    {
      _id: '660000000000000000000001',
      userId: '660000000000000000000042',
      amount: 250,
      categoryId: '660000000000000000000099',
    },
  ];

  (RecurringTransactionEntity as any).findOneAndUpdate = async () => null;
  (CategoryEntity as any).findById = () => ({
    lean: async () => ({ type: 'expense' }),
  });
  (TransactionEntity as any).updateOne = async () => {
    updateCalled = true;
    return { acknowledged: true };
  };

  await recurringService.processDueRecurringTransactions(new Date('2026-04-15T10:00:00.000Z'));

  assert.equal(updateCalled, false);
});
