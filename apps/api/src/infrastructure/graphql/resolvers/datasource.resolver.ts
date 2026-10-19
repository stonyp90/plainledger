import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { AccountingConnectionsService, ConnectionView } from '@application/services/accounting-connections.service';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import {
  AvailableProvider, DataSource, DataSourceStatus, MutationResponse,
  OAuthCallbackInput, OAuthUrlResponse, SyncOptionsInput, SyncResult,
} from '../types';

type AuthContext = { req: { user: AuthenticatedUser } };

@Resolver(() => DataSource)
@UseGuards(GqlAuthGuard)
export class DataSourceResolver {
  constructor(private readonly connections: AccountingConnectionsService) {}

  @Query(() => [DataSource], { name: 'dataSources' })
  async getDataSources(@Context() context: AuthContext): Promise<DataSource[]> {
    return (await this.connections.list(context.req.user)).map((row) => this.view(row));
  }

  @Query(() => DataSource, { name: 'dataSource', nullable: true })
  async getDataSource(@Args('id') id: string, @Context() context: AuthContext): Promise<DataSource> {
    return this.view(await this.connections.get(context.req.user, id));
  }

  @Query(() => [AvailableProvider], { name: 'availableProviders' })
  getAvailableProviders(): AvailableProvider[] {
    return this.connections.providers().map((provider) => ({
      ...provider, logoUrl: `/providers/${provider.id}.svg`, isEnabled: provider.supported,
      supportedFeatures: provider.supported ? ['oauthConnection'] : [],
    }));
  }

  @Mutation(() => OAuthUrlResponse, { name: 'initiateOAuth' })
  initiateOAuth(
    @Args('provider') provider: string, @Args('redirectUri', { nullable: true }) redirectUri?: string,
    @Context() context?: AuthContext,
  ): Promise<OAuthUrlResponse> {
    if (!context?.req?.user) throw new BadRequestException('An authenticated organization is required');
    return this.connections.beginOAuth(context.req.user, provider, redirectUri);
  }

  @Mutation(() => DataSource, { name: 'completeOAuth' })
  async completeOAuth(@Args('input') input: OAuthCallbackInput, @Context() context: AuthContext): Promise<DataSource> {
    return this.view(await this.connections.completeOAuth(undefined, input, context.req.user));
  }

  @Mutation(() => SyncResult, { name: 'syncDataSource' })
  syncDataSource(
    @Args('id') id: string, @Args('options', { nullable: true }) _options?: SyncOptionsInput,
    @Context() context?: AuthContext,
  ): Promise<SyncResult> {
    if (!context?.req?.user) throw new BadRequestException('An authenticated organization is required');
    return this.connections.sync(context.req.user, id);
  }

  @Mutation(() => MutationResponse, { name: 'disconnectDataSource' })
  async disconnectDataSource(@Args('id') id: string, @Context() context: AuthContext): Promise<MutationResponse> {
    await this.connections.disconnect(context.req.user, id);
    return { success: true, message: 'Data source disconnected and stored credentials removed' };
  }

  @Mutation(() => MutationResponse, { name: 'deleteDataSource' })
  async deleteDataSource(@Args('id') id: string, @Args('confirmDelete') confirmDelete: boolean, @Context() context: AuthContext): Promise<MutationResponse> {
    if (!confirmDelete) throw new BadRequestException('Confirm removal of this connection');
    await this.connections.disconnect(context.req.user, id);
    return { success: true, message: 'Connection disconnected. Previously imported accounting records are retained.' };
  }

  private view(row: ConnectionView): DataSource {
    const states: Record<string, DataSourceStatus> = {
      connected: DataSourceStatus.CONNECTED, disconnected: DataSourceStatus.DISCONNECTED,
      error: DataSourceStatus.ERROR, pending: DataSourceStatus.DISCONNECTED, expired: DataSourceStatus.ERROR,
    };
    return {
      id: row.id, provider: row.provider, name: row.name, companyName: row.companyName,
      status: states[row.status] || DataSourceStatus.ERROR, createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt), lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt) : undefined,
    };
  }
}
