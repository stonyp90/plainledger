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
import { AdminChatService, SendMessageDto } from '../services/admin-chat.service';

@ApiTags('Platform Admin - Chat')
@ApiBearerAuth()
@Controller('admin/chat')
@UseGuards(PlatformAdminGuard)
export class AdminChatController {
  constructor(
    private readonly chatService: AdminChatService,
  ) {}

  // =========================================================================
  // Sessions
  // =========================================================================

  @Get('sessions')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'List chat sessions',
    description: 'Returns paginated list of chat sessions with filters' 
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'waiting', 'closed', 'archived'] })
  @ApiQuery({ name: 'assignedAdminId', required: false, type: String })
  @ApiQuery({ name: 'unassigned', required: false, type: Boolean })
  @ApiQuery({ name: 'customerOnline', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  async getSessions(
    @Query('status') status?: string,
    @Query('assignedAdminId') assignedAdminId?: string,
    @Query('unassigned') unassigned?: string,
    @Query('customerOnline') customerOnline?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getSessions({
      status: status as any,
      assignedAdminId,
      unassigned: unassigned === 'true',
      customerOnline: customerOnline ? customerOnline === 'true' : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('sessions/online')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'Get online customers',
    description: 'Returns list of currently online customers with active/waiting sessions' 
  })
  @ApiResponse({ status: 200, description: 'List of online customers' })
  async getOnlineCustomers() {
    return this.chatService.getOnlineCustomers();
  }

  @Get('sessions/:id')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'Get chat session details',
    description: 'Returns detailed information about a specific chat session' 
  })
  @ApiResponse({ status: 200, description: 'Chat session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') id: string) {
    const session = await this.chatService.getSessionById(id);
    if (!session) {
      return { error: 'Session not found' };
    }
    return session;
  }

  @Post('sessions/:id/assign')
  @RequirePermission('chat:manage')
  @ApiOperation({ 
    summary: 'Assign session to admin',
    description: 'Assigns a chat session to the current admin' 
  })
  @ApiResponse({ status: 200, description: 'Session assigned' })
  async assignSession(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const adminId = req.adminUser?.id || req.user?.sub;
    const adminEmail = req.adminUser?.email || req.user?.email;
    
    return this.chatService.assignSession(id, adminId, adminEmail);
  }

  @Post('sessions/:id/close')
  @RequirePermission('chat:manage')
  @ApiOperation({ 
    summary: 'Close chat session',
    description: 'Closes a chat session with optional resolution notes' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resolutionNotes: { type: 'string', description: 'Notes about resolution' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Session closed' })
  async closeSession(
    @Param('id') id: string,
    @Body() body: { resolutionNotes?: string },
    @Request() req: any,
  ) {
    const adminId = req.adminUser?.id || req.user?.sub;
    const adminEmail = req.adminUser?.email || req.user?.email;
    
    return this.chatService.closeSession(id, adminId, adminEmail, body.resolutionNotes);
  }

  // =========================================================================
  // Messages
  // =========================================================================

  @Get('sessions/:id/messages')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'Get chat messages',
    description: 'Returns paginated messages for a chat session' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('id') sessionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      sessionId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Post('sessions/:id/messages')
  @RequirePermission('chat:manage')
  @ApiOperation({ 
    summary: 'Send a message',
    description: 'Sends a message in a chat session as admin' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', description: 'Message content' },
        messageType: { type: 'string', enum: ['text', 'file', 'image', 'link'], default: 'text' },
        fileUrl: { type: 'string', description: 'URL for file/image messages' },
        fileName: { type: 'string' },
        fileSize: { type: 'number' },
        fileType: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() body: Omit<SendMessageDto, 'sessionId' | 'senderType' | 'senderId' | 'senderEmail'>,
    @Request() req: any,
  ) {
    const adminId = req.adminUser?.id || req.user?.sub;
    const adminEmail = req.adminUser?.email || req.user?.email;
    const adminName = req.adminUser?.email?.split('@')[0] || 'Admin';
    
    return this.chatService.sendMessage({
      sessionId,
      senderType: 'admin',
      senderId: adminId,
      senderName: adminName,
      senderEmail: adminEmail,
      ...body,
    });
  }

  @Post('sessions/:id/messages/read')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'Mark messages as read',
    description: 'Marks all unread customer messages in a session as read by admin' 
  })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markMessagesAsRead(@Param('id') sessionId: string) {
    await this.chatService.markMessagesAsRead(sessionId, 'admin');
    return { success: true };
  }

  // =========================================================================
  // Stats
  // =========================================================================

  @Get('stats')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'Get chat statistics',
    description: 'Returns aggregate statistics about chat sessions' 
  })
  @ApiResponse({ status: 200, description: 'Chat statistics' })
  async getStats() {
    return this.chatService.getStats();
  }

  @Get('unread')
  @RequirePermission('chat:view')
  @ApiOperation({ 
    summary: 'Get unread message count',
    description: 'Returns count of unread messages from customers' 
  })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Request() req: any) {
    const adminId = req.adminUser?.id || req.user?.sub;
    const count = await this.chatService.getUnreadMessagesCount(adminId);
    return { unreadCount: count };
  }
}
