import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThan } from 'typeorm';
import { CommunicationLogEntity } from '../entities/communication-log.entity';
import { EmailTemplatesService } from '@infrastructure/templates/email-templates.service';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailTemplate {
  name: string;
  subject: string;
  preview: string;
  lastModified: Date;
}

export interface CommunicationCampaign {
  id: string;
  name: string;
  templateName: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: Date;
  sentAt?: Date;
}

@Injectable()
export class AdminCommunicationService {
  private readonly logger = new Logger(AdminCommunicationService.name);
  private readonly templatesDir: string;

  constructor(
    @InjectRepository(CommunicationLogEntity)
    private readonly communicationLogRepository: Repository<CommunicationLogEntity>,
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {
    this.templatesDir = path.join(__dirname, '../../../templates/emails');
  }

  /**
   * List all email templates
   */
  async listTemplates(): Promise<EmailTemplate[]> {
    try {
      const files = fs.readdirSync(this.templatesDir);
      const templates: EmailTemplate[] = [];

      for (const file of files) {
        if (file === 'base.html' || !file.endsWith('.html')) {
          continue;
        }

        const templateName = path.basename(file, '.html');
        const filePath = path.join(this.templatesDir, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract subject from content (look for common patterns)
        const subjectMatch = content.match(/subject[:\s]*['"]([^'"]+)['"]/i) ||
          content.match(/<title>([^<]+)<\/title>/i);
        const subject = subjectMatch ? subjectMatch[1] : templateName;

        // Get preview (first 200 chars)
        const preview = content
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200);

        templates.push({
          name: templateName,
          subject,
          preview,
          lastModified: stats.mtime,
        });
      }

      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.logger.error(`Failed to list templates: ${error.message}`);
      return [];
    }
  }

  /**
   * Get template content
   */
  async getTemplate(name: string): Promise<string> {
    const filePath = path.join(this.templatesDir, `${name}.html`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template ${name} not found`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Update template
   */
  async updateTemplate(name: string, content: string): Promise<void> {
    const filePath = path.join(this.templatesDir, `${name}.html`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template ${name} not found`);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Preview template with test data
   */
  async previewTemplate(name: string, testData?: Record<string, unknown>): Promise<string> {
    const template = await this.getTemplate(name);
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      organizationName: 'Example Corp',
      ...testData,
      baseUrl: process.env.APP_URL || 'http://localhost:5173',
      year: new Date().getFullYear(),
    };

    // Simple template replacement (in production would use Handlebars)
    let preview = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      preview = preview.replace(regex, String(value));
    }

    return preview;
  }

  /**
   * Send bulk communication
   */
  async sendBulkCommunication(data: {
    templateName: string;
    recipientIds: string[];
    subject: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ campaignId: string; queued: number }> {
    const campaignId = crypto.randomUUID();
    const now = new Date();

    // Create communication log entries
    const logs = data.recipientIds.map((recipientId) => {
      const log = new CommunicationLogEntity();
      log.type = 'email';
      log.templateName = data.templateName;
      log.recipientId = recipientId;
      log.subject = data.subject;
      log.status = 'queued';
      log.campaignId = campaignId;
      log.metadata = data.metadata;
      log.createdAt = now;
      return log;
    });

    await this.communicationLogRepository.save(logs);

    // In production, would queue these for actual sending via email service
    this.logger.log(`Queued ${logs.length} emails for campaign ${campaignId}`);

    return {
      campaignId,
      queued: logs.length,
    };
  }

  /**
   * List communication campaigns
   */
  async listCampaigns(): Promise<CommunicationCampaign[]> {
    const campaigns = await this.communicationLogRepository
      .createQueryBuilder('log')
      .select('log.campaignId', 'id')
      .addSelect('MIN(log.createdAt)', 'createdAt')
      .addSelect('MIN(log.sentAt)', 'sentAt')
      .addSelect('COUNT(*)', 'recipientCount')
      .addSelect('SUM(CASE WHEN log.status = \'sent\' THEN 1 ELSE 0 END)', 'sentCount')
      .addSelect('SUM(CASE WHEN log.status = \'delivered\' THEN 1 ELSE 0 END)', 'deliveredCount')
      .addSelect('SUM(CASE WHEN log.status = \'failed\' THEN 1 ELSE 0 END)', 'failedCount')
      .where('log.campaignId IS NOT NULL')
      .groupBy('log.campaignId')
      .getRawMany();

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: `Campaign ${campaign.id.substring(0, 8)}`,
      templateName: '', // Would need to join or fetch separately
      recipientCount: parseInt(campaign.recipientCount, 10),
      sentCount: parseInt(campaign.sentCount, 10),
      deliveredCount: parseInt(campaign.deliveredCount, 10),
      failedCount: parseInt(campaign.failedCount, 10),
      createdAt: campaign.createdAt,
      sentAt: campaign.sentAt || undefined,
    }));
  }

  /**
   * Get communication logs
   */
  async getCommunicationLogs(params: {
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
    templateName?: string;
  }) {
    const queryBuilder = this.communicationLogRepository.createQueryBuilder('log');

    if (params.type) {
      queryBuilder.andWhere('log.type = :type', { type: params.type });
    }

    if (params.status) {
      queryBuilder.andWhere('log.status = :status', { status: params.status });
    }

    if (params.templateName) {
      queryBuilder.andWhere('log.templateName = :templateName', {
        templateName: params.templateName,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    queryBuilder.take(limit).skip(offset);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      limit,
      offset,
    };
  }
}
