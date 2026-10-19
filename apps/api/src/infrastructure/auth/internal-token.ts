import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

export function requireInternalToken(config: ConfigService, supplied: unknown): void {
  const expected = config.get<string>('INTERNAL_API_TOKEN') || '';
  if (expected.length < 32 || /change.me|your[_-]|placeholder/i.test(expected)) {
    throw new ServiceUnavailableException('Internal service authentication is not configured');
  }
  if (typeof supplied !== 'string') throw new UnauthorizedException('Invalid internal API token');
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw new UnauthorizedException('Invalid internal API token');
  }
}
