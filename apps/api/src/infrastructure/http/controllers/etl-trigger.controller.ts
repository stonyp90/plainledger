import { Body, Controller, Headers, Post, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { Public } from 'nest-keycloak-connect';
import { requireInternalToken } from '@infrastructure/auth/internal-token';
import { CacheService } from '@infrastructure/cache/cache.service';

export class RefreshDatalakeDto {
  @IsString() @MaxLength(100) @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  organization_id: string;
}

@Controller('internal/etl')
@ApiTags('internal')
export class ETLTriggerController {
  constructor(private readonly config: ConfigService, private readonly cache: CacheService) {}

  @Public()
  @Post('trigger')
  @ApiOperation({ summary: 'ETL jobs require a configured persistence worker' })
  triggerETL(@Headers('x-internal-token') token?: string): never {
    requireInternalToken(this.config, token);
    throw new ServiceUnavailableException('ETL execution is not configured. No job was queued.');
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Invalidate the actual organization data cache after successful ETL' })
  async refreshCache(@Body() body: RefreshDatalakeDto, @Headers('x-internal-token') token?: string) {
    requireInternalToken(this.config, token);
    const deletedKeys = await this.cache.invalidateDatalake(body.organization_id);
    return { success: true, organization_id: body.organization_id, deletedKeys };
  }
}
