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
import { Repository, In } from 'typeorm';
import { AdminGroupEntity } from '../entities/admin-group.entity';
import { AdminPermissionEntity } from '../entities/admin-permission.entity';

@ApiTags('Platform Admin - Roles')
@ApiBearerAuth()
@Controller('admin/roles')
@Unprotected()
@UseGuards(PlatformAdminGuard)
export class AdminRolesController {
  constructor(
    @InjectRepository(AdminGroupEntity)
    private readonly groupRepository: Repository<AdminGroupEntity>,
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: Repository<AdminPermissionEntity>,
  ) {}

  @Get()
  @RequirePermission('admin:view')
  @ApiOperation({ summary: 'List all roles (admin groups)' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async listRoles() {
    try {
      const groups = await this.groupRepository.find({
        relations: ['permissions'],
        order: { tierLevel: 'DESC' },
      });
      return groups;
    } catch (error) {
      // Return empty array if table doesn't exist yet
      return [];
    }
  }

  @Get(':id')
  @RequirePermission('admin:view')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role/Group ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRole(@Param('id') id: string) {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!group) {
      throw new Error(`Role ${id} not found`);
    }
    return group;
  }

  @Post()
  @RequirePermission('admin:create')
  @ApiOperation({ summary: 'Create new role (admin group)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
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
    const { permissionIds, ...groupData } = data;
    const group = this.groupRepository.create(groupData as Partial<AdminGroupEntity>);
    const savedGroup = (await this.groupRepository.save(group)) as AdminGroupEntity;

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
      savedGroup.permissions = permissions;
      await this.groupRepository.save(savedGroup);
    }

    return this.groupRepository.findOne({
      where: { id: savedGroup.id },
      relations: ['permissions'],
    });
  }

  @Put(':id')
  @RequirePermission('admin:edit')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role/Group ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(@Param('id') id: string, @Body() data: any) {
    const { permissionIds, ...groupData } = data;
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!group) {
      throw new Error(`Role ${id} not found`);
    }

    if (group.isSystem && groupData.isSystem === false) {
      throw new Error('Cannot modify system role');
    }

    Object.assign(group, groupData);

    if (permissionIds !== undefined) {
      const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
      group.permissions = permissions;
    }

    await this.groupRepository.save(group);
    return this.groupRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
  }

  @Delete(':id')
  @RequirePermission('admin:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role/Group ID' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  async deleteRole(@Param('id') id: string) {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (group?.isSystem) {
      throw new Error('Cannot delete system role');
    }
    await this.groupRepository.delete(id);
  }
}
