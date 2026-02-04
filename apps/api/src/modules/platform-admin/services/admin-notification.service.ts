import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Between } from 'typeorm';
import { PushNotificationEntity, NotificationStatus, NotificationPriority, NotificationChannel } from '@infrastructure/persistence/postgres/entities/push-notification.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { AdminAuditService } from './admin-audit.service';

export interface CreateNotificationDto {
  title: string;
  message: string;
  titleFr?: string;
  messageFr?: string;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  notificationType?: string;
  targetType: 'all' | 'organization' | 'user' | 'industry' | 'plan' | 'segment';
  targetIds?: string[];
  targetFilter?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelFr?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  byChannel: Record<string, number>;
  byTargetType: Record<string, number>;
}

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);

  constructor(
    @InjectRepository(PushNotificationEntity)
    private readonly notificationRepo: Repository<PushNotificationEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userRepo: Repository<UserProfileEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    private readonly auditService: AdminAuditService,
  ) {}

  async createNotification(
    dto: CreateNotificationDto,
    adminId: string,
    adminEmail: string,
  ): Promise<PushNotificationEntity> {
    // Calculate recipients count based on targeting
    const recipientsCount = await this.calculateRecipientsCount(dto);

    const notification = this.notificationRepo.create({
      ...dto,
      recipientsCount,
      status: dto.scheduledAt ? 'pending' : 'pending',
      createdByAdminId: adminId,
      createdByAdminEmail: adminEmail,
    });

    const saved = await this.notificationRepo.save(notification);

    // If not scheduled, send immediately
    if (!dto.scheduledAt) {
      await this.sendNotification(saved.id);
    }

    await this.auditService.logSimple({
      adminId,
      adminEmail,
      action: 'notification:create',
      resourceType: 'notification',
      resourceId: saved.id,
      resourceName: dto.title,
      metadata: {
        targetType: dto.targetType,
        recipientsCount,
        channel: dto.channel || 'in_app',
        scheduled: !!dto.scheduledAt,
      },
    });

    return saved;
  }

  async sendNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    try {
      // Get target users
      const targetUsers = await this.getTargetUsers(notification);
      
      // TODO: Integrate with actual notification delivery (Novu, SNS, etc.)
      // For now, mark as sent and update stats
      this.logger.log(`Sending notification ${notificationId} to ${targetUsers.length} users`);

      await this.notificationRepo.update(notificationId, {
        status: 'sent',
        sentAt: new Date(),
        deliveredCount: targetUsers.length, // Simulated
      });
    } catch (error) {
      this.logger.error(`Failed to send notification ${notificationId}`, error);
      await this.notificationRepo.update(notificationId, {
        status: 'failed',
      });
    }
  }

  async getNotifications(filters: {
    status?: NotificationStatus;
    targetType?: string;
    channel?: NotificationChannel;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: PushNotificationEntity[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const queryBuilder = this.notificationRepo.createQueryBuilder('notification');

    if (filters.status) {
      queryBuilder.andWhere('notification.status = :status', { status: filters.status });
    }

    if (filters.targetType) {
      queryBuilder.andWhere('notification.targetType = :targetType', { targetType: filters.targetType });
    }

    if (filters.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: filters.channel });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(notification.title ILIKE :search OR notification.message ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return { notifications, total };
  }

  async getNotificationById(id: string): Promise<PushNotificationEntity | null> {
    return this.notificationRepo.findOne({ where: { id } });
  }

  async cancelNotification(id: string, adminId: string, adminEmail: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.status === 'sent' || notification.status === 'delivered') {
      throw new Error('Cannot cancel a notification that has already been sent');
    }

    await this.notificationRepo.update(id, { status: 'cancelled' });

    await this.auditService.logSimple({
      adminId,
      adminEmail,
      action: 'notification:cancel',
      resourceType: 'notification',
      resourceId: id,
      resourceName: notification.title,
    });
  }

  async getStats(): Promise<NotificationStats> {
    const total = await this.notificationRepo.count();
    
    const [pending, sent, delivered, failed] = await Promise.all([
      this.notificationRepo.count({ where: { status: 'pending' } }),
      this.notificationRepo.count({ where: { status: 'sent' } }),
      this.notificationRepo.count({ where: { status: 'delivered' } }),
      this.notificationRepo.count({ where: { status: 'failed' } }),
    ]);

    // Get counts by channel
    const byChannelRaw = await this.notificationRepo
      .createQueryBuilder('notification')
      .select('notification.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.channel')
      .getRawMany();

    const byChannel: Record<string, number> = {};
    byChannelRaw.forEach((row) => {
      byChannel[row.channel] = parseInt(row.count);
    });

    // Get counts by target type
    const byTargetTypeRaw = await this.notificationRepo
      .createQueryBuilder('notification')
      .select('notification.targetType', 'targetType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.targetType')
      .getRawMany();

    const byTargetType: Record<string, number> = {};
    byTargetTypeRaw.forEach((row) => {
      byTargetType[row.targetType] = parseInt(row.count);
    });

    return {
      total,
      pending,
      sent,
      delivered,
      failed,
      byChannel,
      byTargetType,
    };
  }

  async getTargetableSegments(): Promise<{
    organizations: { id: string; name: string; userCount: number }[];
    industries: string[];
    plans: string[];
  }> {
    // Get organizations with user counts
    const orgs = await this.orgRepo.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    // Get distinct industries
    const industriesRaw = await this.orgRepo
      .createQueryBuilder('org')
      .select('DISTINCT org.industry', 'industry')
      .where('org.industry IS NOT NULL')
      .getRawMany();
    const industries = industriesRaw.map((r) => r.industry).filter(Boolean);

    // Plans would come from billing system
    const plans = ['free', 'starter', 'professional', 'enterprise'];

    return {
      organizations: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        userCount: 0, // Would need to join with users
      })),
      industries,
      plans,
    };
  }

  private async calculateRecipientsCount(dto: CreateNotificationDto): Promise<number> {
    switch (dto.targetType) {
      case 'all':
        return this.userRepo.count();
      case 'organization':
        if (!dto.targetIds?.length) return 0;
        return this.userRepo.count({
          where: { organizationId: In(dto.targetIds) },
        });
      case 'user':
        return dto.targetIds?.length || 0;
      case 'industry': {
        if (!dto.targetIds?.length) return 0;
        const orgsInIndustry = await this.orgRepo.find({
          where: { industry: In(dto.targetIds) },
          select: ['id'],
        });
        if (!orgsInIndustry.length) return 0;
        return this.userRepo.count({
          where: { organizationId: In(orgsInIndustry.map((o) => o.id)) },
        });
      }
      default:
        return 0;
    }
  }

  private async getTargetUsers(notification: PushNotificationEntity): Promise<UserProfileEntity[]> {
    switch (notification.targetType) {
      case 'all':
        return this.userRepo.find();
      case 'organization':
        if (!notification.targetIds?.length) return [];
        return this.userRepo.find({
          where: { organizationId: In(notification.targetIds) },
        });
      case 'user':
        if (!notification.targetIds?.length) return [];
        return this.userRepo.find({
          where: { id: In(notification.targetIds) },
        });
      case 'industry': {
        if (!notification.targetIds?.length) return [];
        const orgsInIndustry = await this.orgRepo.find({
          where: { industry: In(notification.targetIds) },
          select: ['id'],
        });
        if (!orgsInIndustry.length) return [];
        return this.userRepo.find({
          where: { organizationId: In(orgsInIndustry.map((o) => o.id)) },
        });
      }
      default:
        return [];
    }
  }
}
