import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

// DTO for creating a data source connection
class CreateDataSourceDto {
  provider: string;
  name: string;
  authorizationCode?: string;
  redirectUri?: string;
}

// DTO for OAuth callback
class OAuthCallbackDto {
  code: string;
  state: string;
}

// Response DTOs
class DataSourceResponseDto {
  id: string;
  provider: string;
  name: string;
  status: string;
  lastSyncAt?: string;
  accountsCount?: number;
  transactionsCount?: number;
  createdAt: string;
}

class OAuthUrlResponseDto {
  url: string;
  state: string;
}

// Mock data for development
const mockDataSources: DataSourceResponseDto[] = [];

@ApiTags('Data Sources')
@ApiBearerAuth()
@Controller('api/datasources')
export class DataSourceController {
  
  @Get()
  @ApiOperation({ summary: 'List all data source connections' })
  @ApiResponse({ status: 200, description: 'List of data sources' })
  async listDataSources(
    @Query('tenantId') tenantId?: string,
  ): Promise<DataSourceResponseDto[]> {
    // In production, this would query the database
    return mockDataSources;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific data source' })
  @ApiResponse({ status: 200, description: 'Data source details' })
  @ApiResponse({ status: 404, description: 'Data source not found' })
  async getDataSource(@Param('id') id: string): Promise<DataSourceResponseDto> {
    const dataSource = mockDataSources.find(ds => ds.id === id);
    if (!dataSource) {
      throw new Error('Data source not found');
    }
    return dataSource;
  }

  @Post(':provider/oauth/url')
  @ApiOperation({ summary: 'Get OAuth authorization URL for a provider' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated' })
  async getOAuthUrl(
    @Param('provider') provider: string,
    @Query('redirectUri') redirectUri: string,
  ): Promise<OAuthUrlResponseDto> {
    const state = crypto.randomUUID();
    
    // Provider-specific OAuth URLs
    const oauthUrls: Record<string, string> = {
      quickbooks: `https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=com.intuit.quickbooks.accounting&state=${state}`,
      xero: `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid profile email accounting.transactions accounting.contacts&state=${state}`,
      sage: `https://www.sageone.com/oauth2/auth?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&scope=full_access&state=${state}`,
      freshbooks: `https://api.freshbooks.com/auth/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`,
    };

    const url = oauthUrls[provider];
    if (!url) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return { url, state };
  }

  @Post(':provider/oauth/callback')
  @ApiOperation({ summary: 'Handle OAuth callback from provider' })
  @ApiResponse({ status: 201, description: 'Connection established' })
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Body() callback: OAuthCallbackDto,
  ): Promise<DataSourceResponseDto> {
    // In production, this would:
    // 1. Exchange the authorization code for access/refresh tokens
    // 2. Store the tokens securely
    // 3. Create the data source record

    const newDataSource: DataSourceResponseDto = {
      id: crypto.randomUUID(),
      provider,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Connection`,
      status: 'connected',
      accountsCount: 0,
      transactionsCount: 0,
      createdAt: new Date().toISOString(),
    };

    mockDataSources.push(newDataSource);
    return newDataSource;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new data source connection' })
  @ApiResponse({ status: 201, description: 'Data source created' })
  async createDataSource(
    @Body() dto: CreateDataSourceDto,
  ): Promise<DataSourceResponseDto> {
    const newDataSource: DataSourceResponseDto = {
      id: crypto.randomUUID(),
      provider: dto.provider,
      name: dto.name,
      status: 'connected',
      accountsCount: Math.floor(Math.random() * 50) + 10,
      transactionsCount: Math.floor(Math.random() * 5000) + 500,
      lastSyncAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockDataSources.push(newDataSource);
    return newDataSource;
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger sync for a data source' })
  @ApiResponse({ status: 200, description: 'Sync initiated' })
  async syncDataSource(@Param('id') id: string): Promise<{ message: string; status: string }> {
    const dataSource = mockDataSources.find(ds => ds.id === id);
    if (!dataSource) {
      throw new Error('Data source not found');
    }

    // In production, this would queue a sync job
    dataSource.status = 'syncing';
    
    // Simulate sync completion after a delay
    setTimeout(() => {
      dataSource.status = 'connected';
      dataSource.lastSyncAt = new Date().toISOString();
      dataSource.accountsCount = Math.floor(Math.random() * 50) + 10;
      dataSource.transactionsCount = Math.floor(Math.random() * 5000) + 500;
    }, 3000);

    return { message: 'Sync initiated', status: 'syncing' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect and remove a data source' })
  @ApiResponse({ status: 204, description: 'Data source disconnected' })
  async deleteDataSource(@Param('id') id: string): Promise<void> {
    const index = mockDataSources.findIndex(ds => ds.id === id);
    if (index === -1) {
      throw new Error('Data source not found');
    }
    mockDataSources.splice(index, 1);
  }

  @Get('providers/available')
  @ApiOperation({ summary: 'List available accounting providers' })
  @ApiResponse({ status: 200, description: 'List of available providers' })
  async listProviders(): Promise<{ id: string; name: string; description: string; supported: boolean }[]> {
    return [
      { id: 'quickbooks', name: 'QuickBooks Online', description: 'Intuit QuickBooks accounting software', supported: true },
      { id: 'xero', name: 'Xero', description: 'Cloud-based accounting platform', supported: true },
      { id: 'sage', name: 'Sage', description: 'Sage Business Cloud Accounting', supported: true },
      { id: 'freshbooks', name: 'FreshBooks', description: 'Invoice and accounting software', supported: true },
      { id: 'wave', name: 'Wave', description: 'Free accounting software', supported: false },
      { id: 'csv', name: 'CSV Import', description: 'Import data from CSV files', supported: true },
    ];
  }
}
