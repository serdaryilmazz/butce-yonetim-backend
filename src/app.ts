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
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origin not allowed by CORS.'));
      },
      credentials: true,
    }),
  );
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', router);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
