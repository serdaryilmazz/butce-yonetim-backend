import { NextFunction, Request, Response } from 'express';

export const notFoundMiddleware = (_request: Request, response: Response, _next: NextFunction): void => {
  response.status(404).json({
    success: false,
    data: {
      message: 'Route not found.',
    },
  });
};
