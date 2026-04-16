import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { TransactionEntity } from '../models/transaction.model';
import { analyticsService } from '../services/analytics.service';

const originalDateNow = Date.now;
const OriginalDate = Date;
const originalAggregate = (TransactionEntity as any).aggregate;

afterEach(() => {
  global.Date = OriginalDate;
  Date.now = originalDateNow;
  (TransactionEntity as any).aggregate = originalAggregate;
});

test('getDailyExpenses groups by UTC day within the current UTC month', async () => {
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

  let capturedPipeline: Array<any> = [];
  (TransactionEntity as any).aggregate = async (pipeline: Array<any>) => {
    capturedPipeline = pipeline;
    return [{ _id: 3, totalAmount: 150 }];
  };

  const result = await analyticsService.getDailyExpenses('660000000000000000000042');

  assert.deepEqual(capturedPipeline[0].$match.date, {
    $gte: new OriginalDate('2026-04-01T00:00:00.000Z'),
    $lt: new OriginalDate('2026-05-01T00:00:00.000Z'),
  });
  assert.equal(capturedPipeline[1].$group._id.$dayOfMonth.timezone, 'UTC');
  assert.deepEqual(result, [{ day: 3, amount: 150 }]);
});

test('getMonthlyComparison groups months using UTC boundaries', async () => {
  let capturedPipeline: Array<any> = [];
  (TransactionEntity as any).aggregate = async (pipeline: Array<any>) => {
    capturedPipeline = pipeline;
    return [{ _id: { year: 2026, month: 4, type: 'expense' }, totalAmount: 300 }];
  };

  const result = await analyticsService.getMonthlyComparison('660000000000000000000042');

  assert.equal(capturedPipeline[1].$group._id.year.$year.timezone, 'UTC');
  assert.equal(capturedPipeline[1].$group._id.month.$month.timezone, 'UTC');
  assert.deepEqual(result, {
    '2026-04': {
      income: 0,
      expense: 300,
    },
  });
});
