import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { AdminChatSessionEntity, ChatSessionStatus } from '@infrastructure/persistence/postgres/entities/admin-chat-session.entity';
import { AdminChatMessageEntity, MessageSender, MessageType } from '@infrastructure/persistence/postgres/entities/admin-chat-message.entity';
import { AdminAuditService } from './admin-audit.service';

export interface CreateSessionDto {
  customerUserId: string;
  customerEmail: string;
  customerName?: string;
  organizationId?: string;
  organizationName?: string;
  subject?: string;
  initialMessage?: string;
  pageUrl?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageDto {
  sessionId: string;
  senderType: MessageSender;
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  messageType?: MessageType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatStats {
  totalSessions: number;
  activeSessions: number;
  waitingSessions: number;
  closedToday: number;
  avgResponseTimeSeconds: number;
  onlineCustomers: number;
}

@Injectable()
export class AdminChatService {
  private readonly logger = new Logger(AdminChatService.name);

  constructor(
    @InjectRepository(AdminChatSessionEntity)
    private readonly sessionRepo: Repository<AdminChatSessionEntity>,
    @InjectRepository(AdminChatMessageEntity)
    private readonly messageRepo: Repository<AdminChatMessageEntity>,
    private readonly auditService: AdminAuditService,
  ) {}

  // =========================================================================
  // Sessions
  // =========================================================================

  async createSession(dto: CreateSessionDto): Promise<AdminChatSessionEntity> {
    // Check for existing active session
    const existingSession = await this.sessionRepo.findOne({
      where: {
        customerUserId: dto.customerUserId,
        status: In(['active', 'waiting']),
      },
    });

    if (existingSession) {
      return existingSession;
    }

    const session = this.sessionRepo.create({
      ...dto,
      status: 'waiting',
      customerOnline: true,
      customerLastSeenAt: new Date(),
    });

    return this.sessionRepo.save(session);
  }

  async getSessions(filters: {
    status?: ChatSessionStatus;
    assignedAdminId?: string;
    unassigned?: boolean;
    customerOnline?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sessions: AdminChatSessionEntity[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const queryBuilder = this.sessionRepo.createQueryBuilder('session');

    if (filters.status) {
      queryBuilder.andWhere('session.status = :status', { status: filters.status });
    }

    if (filters.assignedAdminId) {
      queryBuilder.andWhere('session.assignedAdminId = :assignedAdminId', {
        assignedAdminId: filters.assignedAdminId,
      });
    }

    if (filters.unassigned) {
      queryBuilder.andWhere('session.assignedAdminId IS NULL');
    }

    if (filters.customerOnline !== undefined) {
      queryBuilder.andWhere('session.customerOnline = :customerOnline', {
        customerOnline: filters.customerOnline,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(session.customerEmail ILIKE :search OR session.customerName ILIKE :search OR session.subject ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Order by: waiting first, then active, then by last update
    queryBuilder
      .orderBy(
        `CASE session.status 
          WHEN 'waiting' THEN 1 
          WHEN 'active' THEN 2 
          WHEN 'closed' THEN 3 
          ELSE 4 
        END`,
        'ASC',
      )
      .addOrderBy('session.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [sessions, total] = await queryBuilder.getManyAndCount();

    return { sessions, total };
  }

  async getSessionById(id: string): Promise<AdminChatSessionEntity | null> {
    return this.sessionRepo.findOne({ where: { id } });
  }

  async assignSession(
    sessionId: string,
    adminId: string,
    adminEmail: string,
  ): Promise<AdminChatSessionEntity> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Session not found');
    }

    session.assignedAdminId = adminId;
    session.assignedAdminEmail = adminEmail;
    session.assignedAt = new Date();
    session.status = 'active';

    const updated = await this.sessionRepo.save(session);

    await this.auditService.logSimple({
      adminId,
      adminEmail,
      action: 'chat:assign',
      resourceType: 'chat_session',
      resourceId: sessionId,
      resourceName: session.customerEmail,
      metadata: { customerId: session.customerUserId },
    });

    return updated;
  }

  async closeSession(
    sessionId: string,
    adminId: string,
    adminEmail: string,
    resolutionNotes?: string,
  ): Promise<AdminChatSessionEntity> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'closed';
    session.closedAt = new Date();
    session.closedByAdminId = adminId;
    session.resolutionNotes = resolutionNotes;

    const updated = await this.sessionRepo.save(session);

    await this.auditService.logSimple({
      adminId,
      adminEmail,
      action: 'chat:close',
      resourceType: 'chat_session',
      resourceId: sessionId,
      resourceName: session.customerEmail,
      metadata: { resolutionNotes },
    });

    return updated;
  }

  async updateCustomerOnlineStatus(
    customerUserId: string,
    online: boolean,
  ): Promise<void> {
    await this.sessionRepo.update(
      { customerUserId, status: In(['active', 'waiting']) },
      {
        customerOnline: online,
        customerLastSeenAt: new Date(),
      },
    );
  }

  async updateCustomerTypingStatus(
    sessionId: string,
    typing: boolean,
  ): Promise<void> {
    await this.sessionRepo.update(sessionId, { customerTyping: typing });
  }

  // =========================================================================
  // Messages
  // =========================================================================

  async sendMessage(dto: SendMessageDto): Promise<AdminChatMessageEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const message = this.messageRepo.create({
      sessionId: dto.sessionId,
      senderType: dto.senderType,
      senderId: dto.senderId,
      senderName: dto.senderName,
      senderEmail: dto.senderEmail,
      messageType: dto.messageType || 'text',
      content: dto.content,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      fileType: dto.fileType,
      metadata: dto.metadata,
      readByCustomer: dto.senderType === 'customer',
      readByAdmin: dto.senderType === 'admin',
    });

    const saved = await this.messageRepo.save(message);

    // Update session stats
    session.messagesCount += 1;
    if (dto.senderType === 'customer') {
      session.customerMessagesCount += 1;
    } else if (dto.senderType === 'admin') {
      session.adminMessagesCount += 1;
      
      // Track first response time
      if (!session.firstResponseAt && session.customerMessagesCount > 0) {
        session.firstResponseAt = new Date();
        session.firstResponseTimeSeconds = Math.floor(
          (session.firstResponseAt.getTime() - session.createdAt.getTime()) / 1000,
        );
      }
    }

    await this.sessionRepo.save(session);

    return saved;
  }

  async getMessages(
    sessionId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: AdminChatMessageEntity[]; total: number }> {
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages: messages.reverse(), total };
  }

  async markMessagesAsRead(
    sessionId: string,
    readerType: 'customer' | 'admin',
  ): Promise<void> {
    const updateField =
      readerType === 'customer'
        ? { readByCustomer: true, readByCustomerAt: new Date() }
        : { readByAdmin: true, readByAdminAt: new Date() };

    const senderTypeCondition =
      readerType === 'customer' ? 'admin' : 'customer';

    await this.messageRepo.update(
      {
        sessionId,
        senderType: senderTypeCondition as MessageSender,
        ...(readerType === 'customer'
          ? { readByCustomer: false }
          : { readByAdmin: false }),
      },
      updateField,
    );
  }

  // =========================================================================
  // Stats & Online Users
  // =========================================================================

  async getStats(): Promise<ChatStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalSessions,
      activeSessions,
      waitingSessions,
      closedToday,
      onlineCustomers,
    ] = await Promise.all([
      this.sessionRepo.count(),
      this.sessionRepo.count({ where: { status: 'active' } }),
      this.sessionRepo.count({ where: { status: 'waiting' } }),
      this.sessionRepo
        .createQueryBuilder('session')
        .where('session.status = :status', { status: 'closed' })
        .andWhere('session.closedAt >= :today', { today })
        .getCount(),
      this.sessionRepo.count({
        where: { customerOnline: true, status: In(['active', 'waiting']) },
      }),
    ]);

    // Calculate average response time
    const avgResponseResult = await this.sessionRepo
      .createQueryBuilder('session')
      .select('AVG(session.firstResponseTimeSeconds)', 'avg')
      .where('session.firstResponseTimeSeconds IS NOT NULL')
      .getRawOne();

    return {
      totalSessions,
      activeSessions,
      waitingSessions,
      closedToday,
      avgResponseTimeSeconds: Math.round(avgResponseResult?.avg || 0),
      onlineCustomers,
    };
  }

  async getOnlineCustomers(): Promise<AdminChatSessionEntity[]> {
    return this.sessionRepo.find({
      where: {
        customerOnline: true,
        status: In(['active', 'waiting']),
      },
      order: { customerLastSeenAt: 'DESC' },
    });
  }

  async getUnreadMessagesCount(adminId: string): Promise<number> {
    return this.messageRepo.count({
      where: {
        senderType: 'customer',
        readByAdmin: false,
      },
    });
  }
}
