import mongoose from 'mongoose';

export const isValidObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value);
export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isBadRequestError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Cast to ObjectId failed') ||
    error.message === 'Invalid transaction id.' ||
    error.message === 'Invalid category id.' ||
    error.message === 'Invalid category.' ||
    error.message === 'Category type does not match transaction type.' ||
    error.message === 'Invalid expense category.'
  );
};
