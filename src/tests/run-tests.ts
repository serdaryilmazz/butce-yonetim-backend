import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';

import { createApp } from '../app';
import { env } from '../config/env';
import { CategoryEntity } from '../models/category.model';
import { BudgetEntity } from '../models/budget.model';
import { RecurringTransactionEntity } from '../models/recurring-transaction.model';
import { TransactionEntity } from '../models/transaction.model';
import { UserEntity } from '../models/user.model';
import { analyticsService } from '../services/analytics.service';
import { budgetService } from '../services/budget.service';
import { recurringService } from '../services/recurring.service';
import { signToken, verifyToken } from '../utils/jwt';

const OriginalDate = Date;

const restoreDate = () => {
  global.Date = OriginalDate;
};

const createAuthHeader = () => {
  const token = signToken(
    { userId: '660000000000000000000042' },
    {
      secret: env.jwtSecret,
      expiresIn: env.jwtExpiresIn as '15m',
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    },
  );

  return `Bearer ${token}`;
};

const setFixedDate = (iso: string) => {
  const fixedNow = new OriginalDate(iso);

  class MockDate extends OriginalDate {
    constructor(value?: string | number | Date) {
      super(value ?? fixedNow);
    }

    static now() {
      return fixedNow.getTime();
    }
  }

  global.Date = MockDate as DateConstructor;
};

const runJwtTests = async () => {
  const config = {
    secret: '12345678901234567890123456789012',
    expiresIn: '15m' as const,
    issuer: 'budget-api',
    audience: 'budget-client',
  };

  const token = signToken({ userId: 'user-123' }, config);
  const payload = verifyToken(token, {
    secret: config.secret,
    issuer: config.issuer,
    audience: config.audience,
  });

  assert.equal(payload.userId, 'user-123');

  assert.throws(() => {
    verifyToken(token, {
      secret: config.secret,
      issuer: config.issuer,
      audience: 'different-client',
    });
  });
};

const runRecurringTests = async () => {
  const originalFind = (RecurringTransactionEntity as any).find;
  const originalFindOneAndUpdate = (RecurringTransactionEntity as any).findOneAndUpdate;
  const originalFindById = (CategoryEntity as any).findById;
  const originalUpdateOne = (TransactionEntity as any).updateOne;

  try {
    const now = new Date('2026-04-15T10:00:00.000Z');
    const recurringId = '660000000000000000000001';
    const categoryId = '660000000000000000000099';
    const userId = '660000000000000000000042';

    let capturedClaimQuery: unknown;
    let capturedUpdateFilter: unknown;
    let capturedUpdateOptions: unknown;

    (RecurringTransactionEntity as any).find = async () => [
      { _id: recurringId, userId, amount: 250, categoryId },
    ];

    (RecurringTransactionEntity as any).findOneAndUpdate = async (query: unknown) => {
      capturedClaimQuery = query;
      return { _id: recurringId, userId, amount: 250, categoryId };
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

    let updateCalled = false;
    (RecurringTransactionEntity as any).findOneAndUpdate = async () => null;
    (TransactionEntity as any).updateOne = async () => {
      updateCalled = true;
      return { acknowledged: true };
    };

    await recurringService.processDueRecurringTransactions(now);
    assert.equal(updateCalled, false);
  } finally {
    (RecurringTransactionEntity as any).find = originalFind;
    (RecurringTransactionEntity as any).findOneAndUpdate = originalFindOneAndUpdate;
    (CategoryEntity as any).findById = originalFindById;
    (TransactionEntity as any).updateOne = originalUpdateOne;
  }
};

const runBudgetTests = async () => {
  const originalBudgetFind = (BudgetEntity as any).find;
  const originalTransactionAggregate = (TransactionEntity as any).aggregate;

  try {
    setFixedDate('2026-04-20T12:00:00.000Z');

    const aggregateCalls: unknown[] = [];
    (BudgetEntity as any).find = () => ({
      populate: () => ({
        lean: async () => [
          { _id: 'budget-1', limit: 1000, categoryId: { _id: 'cat-1', name: 'Food' } },
          { _id: 'budget-2', limit: 2000 },
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
    assert.equal(pipeline[0].$match.date.$gte.toISOString(), '2026-04-01T00:00:00.000Z');
    assert.equal(pipeline[0].$match.date.$lt.toISOString(), '2026-05-01T00:00:00.000Z');

    assert.equal(result[0].spent, 400);
    assert.equal(result[1].spent, 800);
  } finally {
    (BudgetEntity as any).find = originalBudgetFind;
    (TransactionEntity as any).aggregate = originalTransactionAggregate;
    restoreDate();
  }
};

const runAnalyticsTests = async () => {
  const originalAggregate = (TransactionEntity as any).aggregate;

  try {
    setFixedDate('2026-04-20T12:00:00.000Z');

    let capturedPipeline: Array<any> = [];
    (TransactionEntity as any).aggregate = async (pipeline: Array<any>) => {
      capturedPipeline = pipeline;
      return [{ _id: 3, totalAmount: 150 }];
    };

    const daily = await analyticsService.getDailyExpenses('660000000000000000000042');
    assert.equal(capturedPipeline[0].$match.date.$gte.toISOString(), '2026-04-01T00:00:00.000Z');
    assert.equal(capturedPipeline[0].$match.date.$lt.toISOString(), '2026-05-01T00:00:00.000Z');
    assert.equal(capturedPipeline[1].$group._id.$dayOfMonth.timezone, 'UTC');
    assert.deepEqual(daily, [{ day: 3, amount: 150 }]);

    (TransactionEntity as any).aggregate = async (pipeline: Array<any>) => {
      capturedPipeline = pipeline;
      return [{ _id: { year: 2026, month: 4, type: 'expense' }, totalAmount: 300 }];
    };

    const monthly = await analyticsService.getMonthlyComparison('660000000000000000000042');
    assert.equal(capturedPipeline[1].$group._id.year.$year.timezone, 'UTC');
    assert.equal(capturedPipeline[1].$group._id.month.$month.timezone, 'UTC');
    assert.deepEqual(monthly, {
      '2026-04': {
        income: 0,
        expense: 300,
      },
    });
  } finally {
    (TransactionEntity as any).aggregate = originalAggregate;
    restoreDate();
  }
};

const runIntegrationTests = async () => {
  const originalUserFindById = (UserEntity as any).findById;
  const originalUserFindOne = (UserEntity as any).findOne;
  const originalCategoryFindOne = (CategoryEntity as any).findOne;
  const originalTransactionFindOne = (TransactionEntity as any).findOne;
  const originalTransactionSave = (TransactionEntity as any).prototype.save;

  const app = createApp();
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const authHeader = createAuthHeader();

  try {
    let response = await fetch(`${baseUrl}/api/transactions`, {
      method: 'GET',
    });
    assert.equal(response.status, 401);

    (UserEntity as any).findById = () => ({
      lean: async () => ({
        _id: '660000000000000000000042',
        email: 'user@example.com',
      }),
    });

    response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: authHeader,
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      data: {
        id: '660000000000000000000042',
        email: 'user@example.com',
      },
    });

    (CategoryEntity as any).findOne = () => ({
      lean: async () => null,
    });

    response = await fetch(`${baseUrl}/api/budgets`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categoryId: '660000000000000000000099',
        limit: 500,
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      data: {
        message: 'Invalid expense category.',
      },
    });

    let savedUserId = 'original-owner';
    (TransactionEntity as any).findOne = async () => ({
      type: 'expense',
      amount: 120,
      date: new Date('2026-04-10T00:00:00.000Z'),
      note: 'old note',
      get userId() {
        return savedUserId;
      },
      set userId(value: string) {
        savedUserId = value;
      },
      save: async function () {
        return this;
      },
    });

    response = await fetch(`${baseUrl}/api/transactions/660000000000000000000777`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 999,
        userId: 'attacker-user',
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(savedUserId, 'original-owner');
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.amount, 999);

    response = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: '{"type":"expense"',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      data: {
        message: 'Invalid JSON payload.',
      },
    });

    response = await fetch(`${baseUrl}/api/transactions/invalid-object-id`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 10,
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      data: {
        message: 'Invalid transaction id.',
      },
    });

    let savedPayload: any = null;
    (CategoryEntity as any).findOne = () => ({
      lean: async () => ({
        _id: '660000000000000000000099',
        type: 'income',
      }),
    });
    (TransactionEntity as any).prototype.save = async function () {
      savedPayload = {
        userId: this.userId?.toString?.() ?? this.userId,
        type: this.type,
        amount: this.amount,
        categoryId: this.categoryId?.toString?.() ?? this.categoryId,
      };
      return this;
    };

    response = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 20,
        categoryId: '660000000000000000000099',
        date: '2026-04-10T00:00:00.000Z',
      }),
    });
    assert.equal(response.status, 400);
    assert.equal(savedPayload, null);

    const rateLimitApp = createApp();
    const rateLimitServer = await new Promise<import('node:http').Server>((resolve) => {
      const instance = rateLimitApp.listen(0, () => resolve(instance));
    });

    try {
      (UserEntity as any).findOne = async () => null;
      const rateLimitPort = (rateLimitServer.address() as AddressInfo).port;
      const rateLimitUrl = `http://127.0.0.1:${rateLimitPort}`;

      let lastStatus = 0;
      for (let i = 0; i < 11; i += 1) {
        const rateResponse = await fetch(`${rateLimitUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '203.0.113.10',
          },
          body: JSON.stringify({
            email: 'user@example.com',
            password: 'wrong-password',
          }),
        });
        lastStatus = rateResponse.status;
      }

      assert.equal(lastStatus, 429);
    } finally {
      await new Promise<void>((resolve, reject) => {
        rateLimitServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  } finally {
    (UserEntity as any).findById = originalUserFindById;
    (UserEntity as any).findOne = originalUserFindOne;
    (CategoryEntity as any).findOne = originalCategoryFindOne;
    (TransactionEntity as any).findOne = originalTransactionFindOne;
    (TransactionEntity as any).prototype.save = originalTransactionSave;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};

const run = async () => {
  const tests: Array<[string, () => Promise<void>]> = [
    ['JWT config validation', runJwtTests],
    ['Recurring idempotency', runRecurringTests],
    ['Budget monthly aggregation', runBudgetTests],
    ['Analytics UTC grouping', runAnalyticsTests],
    ['HTTP integration flow', runIntegrationTests],
  ];

  for (const [name, fn] of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }
};

void run().catch((error) => {
  console.error('FAIL', error);
  process.exitCode = 1;
});
