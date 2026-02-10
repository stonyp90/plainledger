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
import { Repository, In } from 'typeorm';
import { RoleEntity } from '@infrastructure/persistence/postgres/entities/role.entity';
import { PermissionEntity } from '@infrastructure/persistence/postgres/entities/permission.entity';

@ApiTags('Platform Admin - Roles')
@ApiBearerAuth()
@Controller('admin/roles')
@UseGuards(PlatformAdminGuard)
export class AdminRolesController {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  @Get()
  @RequirePermission('admin:view')
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async listRoles() {
    try {
      const roles = await this.roleRepository.find({
        relations: ['permissions'],
        order: { tierLevel: 'DESC' },
      });
      return roles;
    } catch (error) {
      // Return empty array if table doesn't exist yet
      return [];
    }
  }

  @Get(':id')
  @RequirePermission('admin:view')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRole(@Param('id') id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new Error(`Role ${id} not found`);
    }
    return role;
  }

  @Post()
  @RequirePermission('admin:create')
  @ApiOperation({ summary: 'Create new role' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        tierLevel: { type: 'number' },
        isSystem: { type: 'boolean' },
        permissionIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async createRole(@Body() data: any) {
    const { permissionIds, ...roleData } = data;
    const role = this.roleRepository.create(roleData);
    const savedRole = (await this.roleRepository.save(role)) as unknown as RoleEntity;

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
      (savedRole as any).permissions = permissions;
      await this.roleRepository.save(savedRole);
    }

    return this.roleRepository.findOne({
      where: { id: savedRole.id },
      relations: ['permissions'],
    });
  }

  @Put(':id')
  @RequirePermission('admin:edit')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(@Param('id') id: string, @Body() data: any) {
    const { permissionIds, ...roleData } = data;
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new Error(`Role ${id} not found`);
    }

    if (role.isSystem && roleData.isSystem === false) {
      throw new Error('Cannot modify system role');
    }

    Object.assign(role, roleData);

    if (permissionIds !== undefined) {
      const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
      (role as any).permissions = permissions;
    }

    await this.roleRepository.save(role);
    return this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
  }

  @Delete(':id')
  @RequirePermission('admin:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  async deleteRole(@Param('id') id: string) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (role?.isSystem) {
      throw new Error('Cannot delete system role');
    }
    await this.roleRepository.delete(id);
  }
}
