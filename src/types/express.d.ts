/* eslint-disable @typescript-eslint/consistent-type-definitions */
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export {};

