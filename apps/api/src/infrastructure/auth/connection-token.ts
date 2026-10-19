import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Provider credentials are bound to the organization, connection and token kind. */
export class ConnectionTokenCipher {
  constructor(private readonly config: ConfigService) {}

  assertConfigured(): void { this.key(); }

  encrypt(value: string, context: string): string {
    if (!value || value.length > 32768) throw new Error('Invalid provider credential');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
    cipher.setAAD(Buffer.from(context));
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  decrypt(value: string, context: string): string {
    const parts = value.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1' || parts.slice(1).some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
      throw new Error('Invalid encrypted provider credential');
    }
    const nonce = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    if (nonce.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted provider credential');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), nonce);
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  }

  private key(): Buffer {
    const encoded = this.config.get<string>('CONNECTION_TOKEN_ENCRYPTION_KEY') || '';
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || key.toString('base64') !== encoded) {
      throw new ServiceUnavailableException('Accounting connection credential encryption is not configured');
    }
    return key;
  }
}
