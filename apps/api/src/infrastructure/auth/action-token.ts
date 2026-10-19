import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type AuthAction = 'reset' | 'verify';
export interface AuthActionClaims { userId: string; email: string; expiry: number; nonce: string; }
const lifetime = { reset: 15 * 60 * 1000, verify: 24 * 60 * 60 * 1000 };

function secret(config: ConfigService): string {
  const value = config.get<string>('TOKEN_SECRET') || config.get<string>('KEYCLOAK_CLIENT_SECRET');
  if (!value || value.length < 32 || value.includes('change-me') || value.startsWith('your_')) {
    throw new ServiceUnavailableException('Authentication action token secret is not configured');
  }
  return value;
}

export function issueAuthAction(config: ConfigService, action: AuthAction, userId: string, email: string): string {
  const payload = Buffer.from(JSON.stringify({ action, userId, email, expiry: Date.now() + lifetime[action], nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret(config)).update(payload).digest('base64url')}`;
}

export function verifyAuthAction(config: ConfigService, action: AuthAction, token: string): AuthActionClaims | null {
  try {
    if (typeof token !== 'string' || token.length > 4096) return null;
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const [payload, supplied] = parts;
    const expected = createHmac('sha256', secret(config)).update(payload).digest();
    const signature = Buffer.from(supplied, 'base64url');
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (claims.action !== action || typeof claims.userId !== 'string' || !claims.userId || claims.userId.length > 100 ||
      typeof claims.email !== 'string' || !claims.email.includes('@') || claims.email.length > 254 ||
      typeof claims.expiry !== 'number' || !Number.isSafeInteger(claims.expiry) || claims.expiry <= Date.now() || claims.expiry > Date.now() + lifetime[action] ||
      typeof claims.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(claims.nonce)) return null;
    return { userId: claims.userId, email: claims.email, expiry: claims.expiry, nonce: claims.nonce };
  } catch { return null; }
}

export function authEmailProvider(config: ConfigService): 'keycloak' | 'ses' {
  const configured = config.get<string>('AUTH_EMAIL_PROVIDER');
  if (configured === 'ses' || configured === 'keycloak') return configured;
  return config.get<string>('NODE_ENV') === 'production' ? 'keycloak' : 'ses';
}
