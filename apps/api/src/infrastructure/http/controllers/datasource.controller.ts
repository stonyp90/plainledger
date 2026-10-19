import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Query, Request, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from 'nest-keycloak-connect';
import { AccountingConnectionsService, ConnectionView } from '@application/services/accounting-connections.service';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { RateLimit } from '../decorators/rate-limit.decorator';

export class OAuthCallbackDto {
  @IsOptional() @IsString() @MaxLength(4096) code?: string;
  @IsString() @MaxLength(43) state: string;
  @IsOptional() @IsString() @MaxLength(32) realmId?: string;
  @IsOptional() @IsString() @MaxLength(255) error?: string;
}

interface AuthRequest { user: AuthenticatedUser }

@ApiTags('Data Sources')
@ApiBearerAuth()
@Controller('datasources')
@UseGuards(JwtAuthGuard)
export class DataSourceController {
  constructor(private readonly connections: AccountingConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List persisted connections for the authenticated organization' })
  @ApiResponse({ status: 200, description: 'Organization connections' })
  listDataSources(@Request() req: AuthRequest, @Query('tenantId') tenantId?: string): Promise<ConnectionView[]> {
    return this.connections.list(req.user, tenantId);
  }

  @Public()
  @Get('providers/available')
  @ApiOperation({ summary: 'List providers and their actual configuration availability' })
  listProviders() { return this.connections.providers(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a connection belonging to the authenticated organization' })
  getDataSource(@Param('id') id: string, @Request() req: AuthRequest): Promise<ConnectionView> {
    return this.connections.get(req.user, id);
  }

  @Post(':provider/oauth/url')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ ttl: 60, limit: 10 })
  @ApiOperation({ summary: 'Start an authenticated, organization-bound provider OAuth flow' })
  getOAuthUrl(@Param('provider') provider: string, @Request() req: AuthRequest, @Query('redirectUri') redirectUri?: string) {
    return this.connections.beginOAuth(req.user, provider, redirectUri);
  }

  @Public()
  @Get(':provider/oauth/callback')
  @RateLimit({ ttl: 60, limit: 20 })
  @ApiOperation({ summary: 'Consume provider callback state and persist an authorized connection' })
  async handleOAuthCallbackGet(
    @Param('provider') provider: string, @Query('code') code: string,
    @Query('state') state: string, @Query('realmId') realmId: string,
    @Query('error') error: string, @Res() res: Response,
  ): Promise<void> {
    const result = await this.connections.completeOAuth(provider, { code, state, realmId, error });
    res.redirect(303, this.connections.redirectUrl(provider, result));
  }

  @Post(':provider/oauth/callback')
  @RateLimit({ ttl: 60, limit: 20 })
  @ApiOperation({ summary: 'Complete OAuth from the initiating authenticated session' })
  handleOAuthCallback(@Param('provider') provider: string, @Body() callback: OAuthCallbackDto, @Request() req: AuthRequest) {
    return this.connections.completeOAuth(provider, callback, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Accounting connections require the provider authorization flow' })
  createDataSource(): never {
    throw new BadRequestException('Start the provider OAuth flow to create an accounting connection');
  }

  @Post(':id/full-sync')
  @ApiOperation({ summary: 'Request a persisted accounting synchronization' })
  fullSync(@Param('id') id: string, @Request() req: AuthRequest) { return this.connections.sync(req.user, id); }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Request a persisted accounting synchronization' })
  syncDataSource(@Param('id') id: string, @Request() req: AuthRequest) { return this.connections.sync(req.user, id); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an organization connection and remove its stored credentials' })
  deleteDataSource(@Param('id') id: string, @Request() req: AuthRequest) { return this.connections.disconnect(req.user, id); }
}
