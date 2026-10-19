import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { authEmailProvider, issueAuthAction, verifyAuthAction } from '../action-token';

const configuration = (values: Record<string, string> = {}): ConfigService => ({ get: (key: string) => values[key] }) as ConfigService;

describe('Authentication action tokens', () => {
  const signingSecret = 's'.repeat(64);
  const config = configuration({ TOKEN_SECRET: signingSecret });
  const sign = (claims: Record<string, unknown>) => {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${payload}.${createHmac('sha256', signingSecret).update(payload).digest('base64url')}`;
  };
  const claims = () => ({ action: 'reset', userId: 'user-123', email: 'member@example.test', expiry: Date.now() + 60000, nonce: 'a'.repeat(32) });

  it('accepts an authentic token and issues unique tokens for repeated requests', () => {
    const token = issueAuthAction(config, 'reset', 'user-123', 'member@example.test');
    expect(verifyAuthAction(config, 'reset', token)).toMatchObject({ userId: 'user-123', email: 'member@example.test' });
    expect(issueAuthAction(config, 'reset', 'user-123', 'member@example.test')).not.toBe(token);
  });
  it('does not accept verification credentials as password reset credentials', () => {
    const token = issueAuthAction(config, 'verify', 'user-123', 'member@example.test');
    expect(verifyAuthAction(config, 'reset', token)).toBeNull();
  });
  it.each([{ expiry: 0 }, { expiry: null }, { expiry: 'never' }, { expiry: '9999999999999' }, { expiry: Date.now() + 86400000 }, { nonce: '' }, { userId: '' }, { email: '' }])('rejects malformed signed claims %j', (override) => {
    expect(verifyAuthAction(config, 'reset', sign({ ...claims(), ...override }))).toBeNull();
  });
  it('rejects forged, truncated, and extra token segments', () => {
    const token = issueAuthAction(config, 'reset', 'user-123', 'member@example.test');
    for (const invalid of [token + '.extra', token.replace(/.$/, '!'), token.split('.')[0], 'x.y', '']) {
      expect(verifyAuthAction(config, 'reset', invalid)).toBeNull();
    }
  });
  it('never uses a fixed fallback signing secret', () => {
    expect(() => issueAuthAction(configuration(), 'reset', 'user', 'a@b.test')).toThrow();
    expect(() => issueAuthAction(configuration({ TOKEN_SECRET: 'short' }), 'reset', 'user', 'a@b.test')).toThrow();
  });
  it('defaults production mail to Keycloak so its configured SMTP handles recovery', () => {
    expect(authEmailProvider(configuration({ NODE_ENV: 'production' }))).toBe('keycloak');
    expect(authEmailProvider(configuration({ NODE_ENV: 'development' }))).toBe('ses');
  });
});
