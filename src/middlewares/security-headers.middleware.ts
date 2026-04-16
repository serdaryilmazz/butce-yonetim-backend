import { NextFunction, Request, Response } from 'express';

export const securityHeadersMiddleware = (_request: Request, response: Response, next: NextFunction): void => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-DNS-Prefetch-Control', 'off');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};
