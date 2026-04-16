import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { BudgetEntity } from '../models/budget.model';
import { TransactionEntity } from '../models/transaction.model';
import { budgetService } from '../services/budget.service';

const originalDateNow = Date.now;
const OriginalDate = Date;
const originalBudgetFind = (BudgetEntity as any).find;
const originalTransactionAggregate = (TransactionEntity as any).aggregate;

afterEach(() => {
  global.Date = OriginalDate;
  Date.now = originalDateNow;
  (BudgetEntity as any).find = originalBudgetFind;
  (TransactionEntity as any).aggregate = originalTransactionAggregate;
});

test('getBudgets uses one monthly aggregate and applies total spending to uncategorized budgets', async () => {
  const fixedNow = new OriginalDate('2026-04-20T12:00:00.000Z');
  class MockDate extends OriginalDate {
    constructor(value?: string | number | Date) {
      super(value ?? fixedNow);
    }

    static now() {
      return fixedNow.getTime();
    }
  }

  (global as any).Date = MockDate;
  Date.now = MockDate.now;

  const aggregateCalls: unknown[] = [];
  (BudgetEntity as any).find = () => ({
    populate: () => ({
      lean: async () => [
        {
          _id: 'budget-1',
          limit: 1000,
          categoryId: { _id: 'cat-1', name: 'Food' },
        },
        {
          _id: 'budget-2',
          limit: 2000,
        },
      ],
    }),
  });

  (TransactionEntity as any).aggregate = async (pipeline: unknown) => {
    aggregateCalls.push(pipeline);
    return [
      { _id: { toString: () => 'cat-1' }, total: 400 },
      { _id: null, total: 100 },
      { _id: { toString: () => 'cat-2' }, total: 300 },
    ];
  };

  const result = await budgetService.getBudgets('660000000000000000000042');

  assert.equal(aggregateCalls.length, 1);
  const pipeline = aggregateCalls[0] as Array<any>;
  assert.deepEqual(pipeline[0].$match.date, {
    $gte: new OriginalDate('2026-04-01T00:00:00.000Z'),
    $lt: new OriginalDate('2026-05-01T00:00:00.000Z'),
  });

  assert.equal(result[0].spent, 400);
  assert.equal(result[0].isOverLimit, false);
  assert.equal(result[1].spent, 800);
  assert.equal(result[1].isOverLimit, false);
});
