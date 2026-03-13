import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Unprotected } from 'nest-keycloak-connect';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntitlementEntity } from '@infrastructure/persistence/postgres/entities/entitlement.entity';

@ApiTags('Platform Admin - Entitlements')
@ApiBearerAuth()
@Controller('admin/entitlements')
@Unprotected()
@UseGuards(PlatformAdminGuard)
export class AdminEntitlementsController {
  constructor(
    @InjectRepository(EntitlementEntity)
    private readonly entitlementRepository: Repository<EntitlementEntity>,
  ) {}

  @Get()
  @RequirePermission('feature:view')
  @ApiOperation({ summary: 'List all entitlements' })
  @ApiResponse({ status: 200, description: 'List of entitlements' })
  async listEntitlements() {
    try {
      const entitlements = await this.entitlementRepository.find({
        order: { category: 'ASC', id: 'ASC' },
      });
      return entitlements;
    } catch (error) {
      // Return empty array if table doesn't exist yet
      return [];
    }
  }

  @Get(':id')
  @RequirePermission('feature:view')
  @ApiOperation({ summary: 'Get entitlement by ID' })
  @ApiParam({ name: 'id', description: 'Entitlement ID' })
  @ApiResponse({ status: 200, description: 'Entitlement details' })
  @ApiResponse({ status: 404, description: 'Entitlement not found' })
  async getEntitlement(@Param('id') id: string) {
    const entitlement = await this.entitlementRepository.findOne({
      where: { id },
      relations: ['plans'],
    });
    if (!entitlement) {
      throw new Error(`Entitlement ${id} not found`);
    }
    return entitlement;
  }

  @Post()
  @RequirePermission('feature:toggle')
  @ApiOperation({ summary: 'Create new entitlement' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Entitlement created successfully' })
  async createEntitlement(@Body() data: Partial<EntitlementEntity>) {
    const entitlement = this.entitlementRepository.create(data);
    return this.entitlementRepository.save(entitlement);
  }

  @Put(':id')
  @RequirePermission('feature:toggle')
  @ApiOperation({ summary: 'Update entitlement' })
  @ApiParam({ name: 'id', description: 'Entitlement ID' })
  @ApiResponse({ status: 200, description: 'Entitlement updated successfully' })
  async updateEntitlement(@Param('id') id: string, @Body() data: Partial<EntitlementEntity>) {
    const entitlement = await this.entitlementRepository.findOne({ where: { id } });
    if (!entitlement) {
      throw new Error(`Entitlement ${id} not found`);
    }
    Object.assign(entitlement, data);
    return this.entitlementRepository.save(entitlement);
  }

  @Delete(':id')
  @RequirePermission('feature:toggle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete entitlement' })
  @ApiParam({ name: 'id', description: 'Entitlement ID' })
  @ApiResponse({ status: 204, description: 'Entitlement deleted successfully' })
  async deleteEntitlement(@Param('id') id: string) {
    await this.entitlementRepository.delete(id);
  }
}
