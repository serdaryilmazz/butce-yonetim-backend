import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`${key} environment variable is required.`);
  }

  return value;
};

const requireStrongSecret = (value: string | undefined, key: string): string => {
  const secret = requireEnv(value, key);
  if (secret.length < 32 || secret.toLowerCase().includes('change-me')) {
    throw new Error(`${key} must be at least 32 characters long and not use placeholder values.`);
  }

  return secret;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: requireEnv(process.env.MONGODB_URI, 'MONGODB_URI'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200,http://localhost,capacitor://localhost',
  jwtSecret: requireStrongSecret(process.env.JWT_SECRET, 'JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtIssuer: process.env.JWT_ISSUER ?? 'butce-yonetim-paneli-api',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'butce-yonetim-paneli-client',
  authCookieName: process.env.AUTH_COOKIE_NAME ?? 'budget_session',
  trustProxy: process.env.TRUST_PROXY ?? 'loopback',
  authCookieSecure: parseBoolean(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === 'production'),
};

export const corsOrigins = env.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
