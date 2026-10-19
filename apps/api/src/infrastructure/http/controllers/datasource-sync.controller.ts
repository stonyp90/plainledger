import { Controller, Headers, Post, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { requireInternalToken } from '@infrastructure/auth/internal-token';

/** A sync may only be acknowledged after a real worker has accepted it. */
@Controller('internal/etl')
@ApiTags('internal')
export class DataSourceSyncController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Post('sync-quickbooks')
  @ApiOperation({ summary: 'Accounting synchronization requires a configured persistence worker' })
  syncQuickBooks(@Headers('x-internal-token') token?: string): never {
    requireInternalToken(this.config, token);
    // Never interpolate provider credentials or identifiers into a shell command.
    // The old script path was absent from production and did not scope its tenant.
    throw new ServiceUnavailableException('Accounting data synchronization is not configured. No sync job was started.');
  }
}
