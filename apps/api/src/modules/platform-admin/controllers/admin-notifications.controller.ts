import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminNotificationService, CreateNotificationDto } from '../services/admin-notification.service';

@ApiTags('Platform Admin - Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(PlatformAdminGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationService: AdminNotificationService,
  ) {}

  @Post()
  @RequirePermission('notification:create')
  @ApiOperation({ 
    summary: 'Create and send a push notification',
    description: 'Creates a notification and sends it to targeted users/organizations' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'message', 'targetType'],
      properties: {
        title: { type: 'string', description: 'Notification title (English)' },
        message: { type: 'string', description: 'Notification message (English)' },
        titleFr: { type: 'string', description: 'Notification title (French)' },
        messageFr: { type: 'string', description: 'Notification message (French)' },
        channel: { type: 'string', enum: ['in_app', 'email', 'push', 'sms'], default: 'in_app' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        targetType: { type: 'string', enum: ['all', 'organization', 'user', 'industry', 'plan'] },
        targetIds: { type: 'array', items: { type: 'string' }, description: 'IDs based on targetType' },
        actionUrl: { type: 'string', description: 'URL when notification is clicked' },
        actionLabel: { type: 'string', description: 'Button label (English)' },
        actionLabelFr: { type: 'string', description: 'Button label (French)' },
        scheduledAt: { type: 'string', format: 'date-time', description: 'Schedule for later' },
        expiresAt: { type: 'string', format: 'date-time', description: 'Expiration time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Notification created and queued' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createNotification(
    @Body() dto: CreateNotificationDto,
    @Request() req: any,
  ) {
    const adminId = req.adminUser?.id || req.user?.sub;
    const adminEmail = req.adminUser?.email || req.user?.email;
    
    return this.notificationService.createNotification(dto, adminId, adminEmail);
  }

  @Get()
  @RequirePermission('notification:list')
  @ApiOperation({ 
    summary: 'List all notifications',
    description: 'Returns paginated list of notifications with filters' 
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'] })
  @ApiQuery({ name: 'targetType', required: false, enum: ['all', 'organization', 'user', 'industry', 'plan'] })
  @ApiQuery({ name: 'channel', required: false, enum: ['in_app', 'email', 'push', 'sms'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
    @Query('channel') channel?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getNotifications({
      status: status as any,
      targetType,
      channel: channel as any,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @RequirePermission('notification:list')
  @ApiOperation({ 
    summary: 'Get notification statistics',
    description: 'Returns aggregate statistics about notifications' 
  })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getStats() {
    return this.notificationService.getStats();
  }

  @Get('segments')
  @RequirePermission('notification:create')
  @ApiOperation({ 
    summary: 'Get targetable segments',
    description: 'Returns available organizations, industries, and plans for targeting' 
  })
  @ApiResponse({ status: 200, description: 'Targetable segments' })
  async getSegments() {
    return this.notificationService.getTargetableSegments();
  }

  @Get(':id')
  @RequirePermission('notification:list')
  @ApiOperation({ 
    summary: 'Get notification details',
    description: 'Returns detailed information about a specific notification' 
  })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(@Param('id') id: string) {
    const notification = await this.notificationService.getNotificationById(id);
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  }

  @Post(':id/cancel')
  @RequirePermission('notification:delete')
  @ApiOperation({ 
    summary: 'Cancel a pending notification',
    description: 'Cancels a notification that has not been sent yet' 
  })
  @ApiResponse({ status: 200, description: 'Notification cancelled' })
  @ApiResponse({ status: 400, description: 'Notification cannot be cancelled' })
  async cancelNotification(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const adminId = req.adminUser?.id || req.user?.sub;
    const adminEmail = req.adminUser?.email || req.user?.email;
    
    await this.notificationService.cancelNotification(id, adminId, adminEmail);
    return { success: true };
  }

  @Post(':id/resend')
  @RequirePermission('notification:create')
  @ApiOperation({ 
    summary: 'Resend a notification',
    description: 'Resends a notification to all targeted recipients' 
  })
  @ApiResponse({ status: 200, description: 'Notification resent' })
  async resendNotification(@Param('id') id: string) {
    await this.notificationService.sendNotification(id);
    return { success: true };
  }
}
