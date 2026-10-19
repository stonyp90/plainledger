import { Controller, Get, Param, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { AccountingConnectionsService } from '@application/services/accounting-connections.service';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { RateLimit } from '../decorators/rate-limit.decorator';

/** Retains the registered callback URL while sharing all state/persistence checks. */
@ApiTags('OAuth')
@Controller('v1/datasources/oauth')
@UseGuards(JwtAuthGuard)
export class OAuthCallbackController {
  constructor(private readonly connections: AccountingConnectionsService) {}

  @Public()
  @Get(':provider/callback')
  @RateLimit({ ttl: 60, limit: 20 })
  @ApiOperation({ summary: 'Validate a provider callback and complete the authorized organization connection' })
  async handleCallback(
    @Param('provider') provider: string, @Query('code') code: string,
    @Query('state') state: string, @Query('realmId') realmId: string,
    @Query('error') error: string, @Res() res: Response,
  ): Promise<void> {
    const result = await this.connections.completeOAuth(provider, { code, state, realmId, error });
    res.redirect(303, this.connections.redirectUrl(provider, result));
  }

  @Get('connections')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List persisted connections for the authenticated organization' })
  listConnections(@Request() req: { user: AuthenticatedUser }) { return this.connections.list(req.user); }
}
