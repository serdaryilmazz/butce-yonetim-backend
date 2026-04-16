import { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { parseCookies } from '../utils/cookies';
import { verifyToken } from '../utils/jwt';

export const authMiddleware = (request: Request, response: Response, next: NextFunction): void => {
  const authHeader = request.header('authorization') ?? request.header('Authorization');
  const cookies = parseCookies(request.header('cookie'));
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  const cookieToken = cookies[env.authCookieName];
  const token = bearerToken ?? cookieToken;

  if (!token) {
    response.status(401).json({ success: false, data: { message: 'Unauthorized.' } });
    return;
  }

  try {
    const payload = verifyToken(token, {
      secret: env.jwtSecret,
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
    request.user = { id: payload.userId };
    next();
  } catch {
    response.status(401).json({ success: false, data: { message: 'Unauthorized.' } });
  }
};
