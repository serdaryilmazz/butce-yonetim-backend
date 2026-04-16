import mongoose from 'mongoose';

import { logger } from '../utils/logger';

let hasAttachedConnectionListeners = false;
let isDatabaseReady = false;

const attachConnectionListeners = (): void => {
  if (hasAttachedConnectionListeners) return;
  hasAttachedConnectionListeners = true;

  mongoose.connection.on('connected', () => {
    isDatabaseReady = true;
    logger.info('MongoDB connected.');
  });

  mongoose.connection.on('disconnected', () => {
    isDatabaseReady = false;
    logger.info('MongoDB disconnected.');
  });

  mongoose.connection.on('error', (error) => {
    isDatabaseReady = false;
    logger.error('MongoDB connection error.', error);
  });
};

export const connectDB = async (mongodbUri: string): Promise<void> => {
  try {
    attachConnectionListeners();
    await mongoose.connect(mongodbUri);
    logger.info('MongoDB connection established successfully.');
  } catch (error) {
    logger.error('MongoDB connection failed.', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

export const getDatabaseStatus = (): { ready: boolean; state: number } => ({
  ready: isDatabaseReady && mongoose.connection.readyState === 1,
  state: mongoose.connection.readyState,
});
