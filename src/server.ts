import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { recurringService } from './services/recurring.service';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    await connectDB(env.mongodbUri);
    const { categoryService } = await import('./services/category.service');
    await categoryService.seedDefaultCategories();
    await recurringService.processDueRecurringTransactions();

    const app = createApp();
    const server = app.listen(env.port, () => {
      logger.info(`Server is running on port ${env.port}.`);
    });
    server.headersTimeout = 15_000;
    server.requestTimeout = 15_000;
    server.keepAliveTimeout = 5_000;
    const recurringTimer = setInterval(() => {
      void recurringService.processDueRecurringTransactions();
    }, 5 * 60 * 1000);

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down...`);
      clearInterval(recurringTimer);
      const shutdownTimeout = setTimeout(() => {
        logger.error('Graceful shutdown timed out.');
        process.exit(1);
      }, 10_000);
      shutdownTimeout.unref();

      server.close(async (error) => {
        if (error) {
          logger.error('HTTP server close failed.', error);
          process.exitCode = 1;
        }

        try {
          await disconnectDB();
        } catch (disconnectError) {
          logger.error('MongoDB disconnect failed.', disconnectError);
          process.exitCode = 1;
        } finally {
          clearTimeout(shutdownTimeout);
          process.exit();
        }
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Server startup failed.', error);
    process.exit(1);
  }
};

void startServer();
