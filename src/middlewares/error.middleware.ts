import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';
import { isBadRequestError } from '../utils/validation';

export const errorMiddleware = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({
      success: false,
      data: {
        message: 'Invalid JSON payload.',
      },
    });
    return;
  }

  if (error instanceof Error && error.message === 'Origin not allowed by CORS.') {
    response.status(403).json({
      success: false,
      data: {
        message: 'Origin not allowed.',
      },
    });
    return;
  }

  if (isBadRequestError(error)) {
    response.status(400).json({
      success: false,
      data: {
        message: error instanceof Error ? error.message : 'Invalid request.',
      },
    });
    return;
  }

  logger.error('Unhandled application error.', error);
  response.status(500).json({
    success: false,
    data: {
      message: 'Internal server error.',
    },
  });
};
