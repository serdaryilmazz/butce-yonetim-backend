import rateLimit from 'express-rate-limit';

export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  message: {
    success: false,
    data: {
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});
