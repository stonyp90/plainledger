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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '@infrastructure/persistence/postgres/entities/permission.entity';

@ApiTags('Platform Admin - Permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(PlatformAdminGuard)
export class AdminPermissionsController {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  @Get()
  @RequirePermission('admin:view')
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async listPermissions() {
    const permissions = await this.permissionRepository.find({
      order: { category: 'ASC', id: 'ASC' },
    });
    return permissions;
  }

  @Get(':id')
  @RequirePermission('admin:view')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission details' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async getPermission(@Param('id') id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!permission) {
      throw new Error(`Permission ${id} not found`);
    }
    return permission;
  }

  @Post()
  @RequirePermission('admin:create')
  @ApiOperation({ summary: 'Create new permission' })
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
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  async createPermission(@Body() data: Partial<PermissionEntity>) {
    const permission = this.permissionRepository.create(data);
    return this.permissionRepository.save(permission);
  }

  @Put(':id')
  @RequirePermission('admin:edit')
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  async updatePermission(@Param('id') id: string, @Body() data: Partial<PermissionEntity>) {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new Error(`Permission ${id} not found`);
    }
    Object.assign(permission, data);
    return this.permissionRepository.save(permission);
  }

  @Delete(':id')
  @RequirePermission('admin:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  async deletePermission(@Param('id') id: string) {
    await this.permissionRepository.delete(id);
  }
}
