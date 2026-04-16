import bcrypt from 'bcryptjs';
import { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import { UserEntity } from '../models/user.model';
import { signToken } from '../utils/jwt';
import { isValidEmail } from '../utils/validation';

type AuthResult = {
  user: { id: string; email: string };
};

class AuthService {
  private readonly tokenConfig = {
    secret: env.jwtSecret,
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  };

  async register(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email format.');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const existingUser = await UserEntity.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      throw new Error('Email already in use.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserEntity.create({ email: normalizedEmail, password: passwordHash });

    return { user: { id: user.id, email: user.email } };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email format.');
    }

    const user = await UserEntity.findOne({ email: normalizedEmail });
    if (!user) {
      throw new Error('Invalid credentials.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials.');
    }

    return { user: { id: user.id, email: user.email } };
  }

  async getCurrentUser(userId: string): Promise<{ id: string; email: string }> {
    const user = await UserEntity.findById(userId).lean();
    if (!user) {
      throw new Error('User not found.');
    }

    return { id: user._id.toString(), email: user.email };
  }

  createSessionToken(userId: string): string {
    return signToken({ userId }, this.tokenConfig);
  }
}

export const authService = new AuthService();
