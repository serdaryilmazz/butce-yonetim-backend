import { Request, Response } from 'express';

import { env } from '../config/env';
import { authService } from '../services/auth.service';
import { isValidEmail } from '../utils/validation';

type AuthBody = {
  email?: string;
  password?: string;
};

class AuthController {
  private setSessionCookie(response: Response, token: string): void {
    response.cookie(env.authCookieName, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.authCookieSecure,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
  }

  private clearSessionCookie(response: Response): void {
    response.clearCookie(env.authCookieName, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.authCookieSecure,
      path: '/',
    });
  }

  async register(request: Request, response: Response): Promise<void> {
    try {
      const { email, password } = request.body as AuthBody;
      if (!email || !password) {
        response.status(400).json({ success: false, data: { message: 'Email and password are required.' } });
        return;
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        response.status(400).json({ success: false, data: { message: 'Invalid payload type.' } });
        return;
      }

      if (!isValidEmail(email.trim().toLowerCase())) {
        response.status(400).json({ success: false, data: { message: 'Invalid email format.' } });
        return;
      }

      if (password.length < 8) {
        response.status(400).json({ success: false, data: { message: 'Password must be at least 8 characters.' } });
        return;
      }

      const result = await authService.register(email, password);
      this.setSessionCookie(response, authService.createSessionToken(result.user.id));
      response.status(201).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      const status =
        message === 'Email already in use.'
          ? 409
          : message === 'Invalid email format.' || message === 'Password must be at least 8 characters.'
            ? 400
            : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }

  async login(request: Request, response: Response): Promise<void> {
    try {
      const { email, password } = request.body as AuthBody;
      if (!email || !password) {
        response.status(400).json({ success: false, data: { message: 'Email and password are required.' } });
        return;
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        response.status(400).json({ success: false, data: { message: 'Invalid payload type.' } });
        return;
      }

      if (!isValidEmail(email.trim().toLowerCase())) {
        response.status(400).json({ success: false, data: { message: 'Invalid email format.' } });
        return;
      }

      const result = await authService.login(email, password);
      this.setSessionCookie(response, authService.createSessionToken(result.user.id));
      response.status(200).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      const status = message === 'Invalid credentials.' ? 401 : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }

  async me(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const user = await authService.getCurrentUser(userId);
      response.status(200).json({ success: true, data: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch current user.';
      const status = message === 'User not found.' ? 404 : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }

  logout(_request: Request, response: Response): void {
    this.clearSessionCookie(response);
    response.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.',
      },
    });
  }
}

export const authController = new AuthController();
