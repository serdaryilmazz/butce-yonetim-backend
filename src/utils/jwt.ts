import jwt, { SignOptions } from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
};

type JwtConfig = {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
  issuer: string;
  audience: string;
};

export const signToken = (payload: JwtPayload, config: JwtConfig): string => {
  const options: SignOptions = {
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
    algorithm: 'HS256',
  };

  const { userId } = payload;
  const safePayload: JwtPayload = { userId };

  return jwt.sign(safePayload, config.secret, options) as string;
};

export const verifyToken = (token: string, config: Omit<JwtConfig, 'expiresIn'>): JwtPayload => {
  const decoded = jwt.verify(token, config.secret, {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
  });

  if (!decoded || typeof decoded !== 'object' || !('userId' in decoded) || typeof decoded.userId !== 'string') {
    throw new Error('Invalid token payload.');
  }

  return decoded as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || !('userId' in decoded) || typeof decoded.userId !== 'string') {
    return null;
  }

  return decoded as JwtPayload;
};
