/**
 * Job Configuration Service
 *
 * Manages scheduled job configurations and sends alerts.
 * Allows super admins to configure jobs via the UI.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";

export interface JobConfiguration {
  id: string;
  nameEn: string;
  nameFr: string;
  descriptionEn?: string;
  descriptionFr?: string;
  category: "sync" | "cleanup" | "reporting" | "ai" | "notifications";

  // Schedule
  isEnabled: boolean;
  cronExpression: string;
  timezone: string;

  // Execution
  timeoutSeconds: number;
  maxRetries: number;
  retryDelaySeconds: number;

  // Alerts
  alertOnFailure: boolean;
  alertOnSuccess: boolean;
  alertOnChangesDetected: boolean;
  alertEmails: string[];
  alertSlackWebhook?: string;

  // Status
  lastRunAt?: Date;
  lastRunStatus?: "success" | "failed" | "partial" | "skipped";
  lastRunDurationMs?: number;
  lastRunResult?: Record<string, unknown>;
  nextRunAt?: Date;
}

export interface JobExecution {
  id: string;
  jobId: string;
  runId: string;
  triggerType: "scheduled" | "manual" | "retry";
  triggeredBy?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: Record<string, unknown>;
  errorMessage?: string;
}

export interface UpdateJobConfigDto {
  isEnabled?: boolean;
  cronExpression?: string;
  timezone?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  alertOnFailure?: boolean;
  alertOnSuccess?: boolean;
  alertOnChangesDetected?: boolean;
  alertEmails?: string[];
  alertSlackWebhook?: string;
}

@Injectable()
export class JobConfigurationService {
  private readonly logger = new Logger(JobConfigurationService.name);
  private dbPool: Pool | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const dbUrl =
        this.configService?.get<string>("DATABASE_URL") ||
        process.env.DATABASE_URL ||
        "postgresql://plainledger:plainledger@localhost:5432/plainledger";
      this.dbPool = new Pool({ connectionString: dbUrl });
      this.logger.log("JobConfigurationService database initialized");
    } catch (error) {
      this.logger.error(`Failed to initialize database: ${error}`);
    }
  }

  /**
   * Get all job configurations
   */
  async getAllJobs(): Promise<JobConfiguration[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const result = await this.dbPool.query(`
      SELECT * FROM system.job_configurations
      ORDER BY category, id
    `);

    return result.rows.map(this.mapRowToConfig);
  }

  /**
   * Get a specific job configuration
   */
  async getJob(jobId: string): Promise<JobConfiguration | null> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const result = await this.dbPool.query(
      `SELECT * FROM system.job_configurations WHERE id = $1`,
      [jobId],
    );

    return result.rows[0] ? this.mapRowToConfig(result.rows[0]) : null;
  }

  /**
   * Update job configuration (super admin only)
   */
  async updateJob(
    jobId: string,
    updates: UpdateJobConfigDto,
    updatedBy: string,
  ): Promise<JobConfiguration> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.isEnabled !== undefined) {
      setClauses.push(`is_enabled = $${paramIndex++}`);
      values.push(updates.isEnabled);
    }
    if (updates.cronExpression !== undefined) {
      setClauses.push(`cron_expression = $${paramIndex++}`);
      values.push(updates.cronExpression);
    }
    if (updates.timezone !== undefined) {
      setClauses.push(`timezone = $${paramIndex++}`);
      values.push(updates.timezone);
    }
    if (updates.timeoutSeconds !== undefined) {
      setClauses.push(`timeout_seconds = $${paramIndex++}`);
      values.push(updates.timeoutSeconds);
    }
    if (updates.maxRetries !== undefined) {
      setClauses.push(`max_retries = $${paramIndex++}`);
      values.push(updates.maxRetries);
    }
    if (updates.retryDelaySeconds !== undefined) {
      setClauses.push(`retry_delay_seconds = $${paramIndex++}`);
      values.push(updates.retryDelaySeconds);
    }
    if (updates.alertOnFailure !== undefined) {
      setClauses.push(`alert_on_failure = $${paramIndex++}`);
      values.push(updates.alertOnFailure);
    }
    if (updates.alertOnSuccess !== undefined) {
      setClauses.push(`alert_on_success = $${paramIndex++}`);
      values.push(updates.alertOnSuccess);
    }
    if (updates.alertOnChangesDetected !== undefined) {
      setClauses.push(`alert_on_changes_detected = $${paramIndex++}`);
      values.push(updates.alertOnChangesDetected);
    }
    if (updates.alertEmails !== undefined) {
      setClauses.push(`alert_emails = $${paramIndex++}`);
      values.push(updates.alertEmails);
    }
    if (updates.alertSlackWebhook !== undefined) {
      setClauses.push(`alert_slack_webhook = $${paramIndex++}`);
      values.push(updates.alertSlackWebhook || null);
    }

    if (setClauses.length === 0) {
      const job = await this.getJob(jobId);
      if (!job) throw new Error(`Job ${jobId} not found`);
      return job;
    }

    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy);

    values.push(jobId);

    const result = await this.dbPool.query(
      `UPDATE system.job_configurations
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    this.logger.log(`Job ${jobId} updated by ${updatedBy}`);
    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Record job execution start
   */
  async recordJobStart(
    jobId: string,
    runId: string,
    triggerType: "scheduled" | "manual" | "retry",
    triggeredBy?: string,
  ): Promise<string> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const result = await this.dbPool.query(
      `INSERT INTO system.job_executions
       (job_id, run_id, trigger_type, triggered_by, status, started_at)
       VALUES ($1, $2, $3, $4, 'running', NOW())
       RETURNING id`,
      [jobId, runId, triggerType, triggeredBy],
    );

    return result.rows[0].id;
  }

  /**
   * Record job execution completion
   */
  async recordJobCompletion(
    executionId: string,
    status: "completed" | "failed" | "cancelled",
    result?: Record<string, unknown>,
    errorMessage?: string,
  ): Promise<void> {
    if (!this.dbPool) throw new Error("Database not initialized");

    await this.dbPool.query(
      `UPDATE system.job_executions
       SET status = $1,
           completed_at = NOW(),
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
           result = $2,
           error_message = $3
       WHERE id = $4`,
      [status, result ? JSON.stringify(result) : null, errorMessage, executionId],
    );

    // Update job configuration with last run info
    const exec = await this.dbPool.query(
      `SELECT job_id, started_at, 
              EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000 as duration_ms
       FROM system.job_executions WHERE id = $1`,
      [executionId],
    );

    if (exec.rows[0]) {
      await this.dbPool.query(
        `UPDATE system.job_configurations
         SET last_run_at = $1,
             last_run_status = $2,
             last_run_duration_ms = $3,
             last_run_result = $4
         WHERE id = $5`,
        [
          exec.rows[0].started_at,
          status === "completed" ? "success" : status,
          Math.round(exec.rows[0].duration_ms),
          result ? JSON.stringify(result) : null,
          exec.rows[0].job_id,
        ],
      );
    }
  }

  /**
   * Get job execution history
   */
  async getJobExecutions(
    jobId: string,
    limit: number = 20,
  ): Promise<JobExecution[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const result = await this.dbPool.query(
      `SELECT * FROM system.job_executions
       WHERE job_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [jobId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      runId: row.run_id,
      triggerType: row.trigger_type,
      triggeredBy: row.triggered_by,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      result: row.result,
      errorMessage: row.error_message,
    }));
  }

  /**
   * Send job alert (failure, success, or changes detected)
   */
  async sendJobAlert(
    jobId: string,
    alertType: "failure" | "success" | "changes_detected",
    runId: string,
    details: {
      errorMessage?: string;
      changesCount?: number;
      changesList?: string[];
      summary?: Record<string, unknown>;
      startedAt: Date;
      completedAt?: Date;
    },
  ): Promise<void> {
    if (!this.dbPool) throw new Error("Database not initialized");

    // Get job config
    const job = await this.getJob(jobId);
    if (!job) {
      this.logger.warn(`Cannot send alert: job ${jobId} not found`);
      return;
    }

    // Check if alert should be sent
    if (alertType === "failure" && !job.alertOnFailure) return;
    if (alertType === "success" && !job.alertOnSuccess) return;
    if (alertType === "changes_detected" && !job.alertOnChangesDetected) return;

    if (job.alertEmails.length === 0 && !job.alertSlackWebhook) {
      this.logger.debug(`No alert recipients configured for job ${jobId}`);
      return;
    }

    // Get alert template
    const templateId =
      alertType === "failure"
        ? "job_failed"
        : alertType === "changes_detected"
          ? "changes_detected"
          : "job_success";

    const templateResult = await this.dbPool.query(
      `SELECT * FROM system.alert_templates WHERE id = $1`,
      [templateId],
    );

    if (templateResult.rows.length === 0) {
      this.logger.error(`Alert template ${templateId} not found`);
      return;
    }

    const template = templateResult.rows[0];
    const language = "en"; // TODO: Get from admin preferences

    // Prepare template variables
    const duration = details.completedAt
      ? this.formatDuration(
          details.completedAt.getTime() - details.startedAt.getTime(),
        )
      : "N/A";

    const variables: Record<string, string> = {
      job_id: jobId,
      job_name: language === "en" ? job.nameEn : job.nameFr,
      run_id: runId,
      started_at: details.startedAt.toISOString(),
      completed_at: details.completedAt?.toISOString() || "N/A",
      duration,
      error_message: details.errorMessage || "",
      changes_count: String(details.changesCount || 0),
      changes_list:
        details.changesList?.map((c) => `<li>${c}</li>`).join("") || "",
      summary: details.summary ? JSON.stringify(details.summary, null, 2) : "",
    };

    // Render template
    let subject =
      language === "en" ? template.subject_en : template.subject_fr;
    let body =
      language === "en" ? template.body_html_en : template.body_html_fr;

    for (const [key, value] of Object.entries(variables)) {
      subject = subject.replace(new RegExp(`{{${key}}}`, "g"), value);
      body = body.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    // Send email alerts
    if (job.alertEmails.length > 0) {
      await this.sendEmailAlert(job.alertEmails, subject, body);
    }

    // Send Slack alert
    if (job.alertSlackWebhook) {
      await this.sendSlackAlert(job.alertSlackWebhook, job, alertType, details);
    }

    this.logger.log(
      `Sent ${alertType} alert for job ${jobId} to ${job.alertEmails.length} recipients`,
    );
  }

  /**
   * Send email alert via SES
   */
  private async sendEmailAlert(
    recipients: string[],
    subject: string,
    htmlBody: string,
  ): Promise<void> {
    // TODO: Use SES adapter for production
    // For now, log the alert
    this.logger.log(`[Email Alert] To: ${recipients.join(", ")}`);
    this.logger.log(`[Email Alert] Subject: ${subject}`);

    // In production, this would call the SES adapter:
    // await this.sesAdapter.sendEmail({
    //   to: recipients,
    //   subject,
    //   html: htmlBody,
    // });
  }

  /**
   * Send Slack webhook alert
   */
  private async sendSlackAlert(
    webhookUrl: string,
    job: JobConfiguration,
    alertType: "failure" | "success" | "changes_detected",
    details: {
      errorMessage?: string;
      changesCount?: number;
      changesList?: string[];
    },
  ): Promise<void> {
    const emoji =
      alertType === "failure"
        ? "🚨"
        : alertType === "changes_detected"
          ? "🔔"
          : "✅";
    const color =
      alertType === "failure"
        ? "#dc2626"
        : alertType === "changes_detected"
          ? "#f59e0b"
          : "#16a34a";

    const payload = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${emoji} ${alertType === "failure" ? "Job Failed" : alertType === "changes_detected" ? "Changes Detected" : "Job Completed"}: ${job.nameEn}`,
              },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Job ID:*\n${job.id}` },
                {
                  type: "mrkdwn",
                  text: `*Status:*\n${alertType.replace("_", " ")}`,
                },
              ],
            },
            ...(details.errorMessage
              ? [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: `*Error:*\n\`\`\`${details.errorMessage}\`\`\``,
                    },
                  },
                ]
              : []),
            ...(details.changesList && details.changesList.length > 0
              ? [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: `*Changes:*\n${details.changesList.map((c) => `• ${c}`).join("\n")}`,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    };

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(`Failed to send Slack alert: ${error}`);
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  /**
   * Check if a job is enabled
   */
  async isJobEnabled(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    return job?.isEnabled ?? false;
  }

  /**
   * Map database row to JobConfiguration
   */
  private mapRowToConfig(row: Record<string, unknown>): JobConfiguration {
    return {
      id: row.id as string,
      nameEn: row.name_en as string,
      nameFr: row.name_fr as string,
      descriptionEn: row.description_en as string,
      descriptionFr: row.description_fr as string,
      category: row.category as JobConfiguration["category"],
      isEnabled: row.is_enabled as boolean,
      cronExpression: row.cron_expression as string,
      timezone: row.timezone as string,
      timeoutSeconds: row.timeout_seconds as number,
      maxRetries: row.max_retries as number,
      retryDelaySeconds: row.retry_delay_seconds as number,
      alertOnFailure: row.alert_on_failure as boolean,
      alertOnSuccess: row.alert_on_success as boolean,
      alertOnChangesDetected: row.alert_on_changes_detected as boolean,
      alertEmails: (row.alert_emails as string[]) || [],
      alertSlackWebhook: row.alert_slack_webhook as string | undefined,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at as string) : undefined,
      lastRunStatus: row.last_run_status as JobConfiguration["lastRunStatus"],
      lastRunDurationMs: row.last_run_duration_ms as number,
      lastRunResult: row.last_run_result as Record<string, unknown>,
      nextRunAt: row.next_run_at ? new Date(row.next_run_at as string) : undefined,
    };
  }
}
