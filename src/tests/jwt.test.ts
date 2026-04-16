import assert from 'node:assert/strict';
import test from 'node:test';

import { signToken, verifyToken } from '../utils/jwt';

const baseConfig = {
  secret: '12345678901234567890123456789012',
  expiresIn: '15m' as const,
  issuer: 'budget-api',
  audience: 'budget-client',
};

test('signToken and verifyToken accept valid issuer and audience', () => {
  const token = signToken({ userId: 'user-123' }, baseConfig);
  const payload = verifyToken(token, {
    secret: baseConfig.secret,
    issuer: baseConfig.issuer,
    audience: baseConfig.audience,
  });

  assert.equal(payload.userId, 'user-123');
});

test('verifyToken rejects a token with the wrong audience', () => {
  const token = signToken({ userId: 'user-123' }, baseConfig);

  assert.throws(() => {
    verifyToken(token, {
      secret: baseConfig.secret,
      issuer: baseConfig.issuer,
      audience: 'different-client',
    });
  });
});
