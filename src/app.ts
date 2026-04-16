import cors from 'cors';
import express from 'express';

import { corsOrigins, env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { securityHeadersMiddleware } from './middlewares/security-headers.middleware';
import { router } from './routes';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  const allowedOrigins = new Set(corsOrigins);

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    }),
  );
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', router);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
