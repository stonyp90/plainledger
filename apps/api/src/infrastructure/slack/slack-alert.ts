import { Logger } from '@nestjs/common';

const logger = new Logger('SlackAlert');

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_STACK_LENGTH = 500;
const recentAlerts = new Map<string, number>();

let loggedMissingWebhook = false;

function getWebhookUrl(): string | undefined {
  return process.env.SLACK_ALERT_WEBHOOK_URL;
}

function hashSignature(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = ((hash << 5) - hash + message.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function isRateLimited(signature: string): boolean {
  const now = Date.now();
  const lastSent = recentAlerts.get(signature);
  if (lastSent && now - lastSent < RATE_LIMIT_MS) {
    return true;
  }
  recentAlerts.set(signature, now);

  // Cleanup old entries
  if (recentAlerts.size > 200) {
    for (const [key, time] of recentAlerts) {
      if (now - time > RATE_LIMIT_MS) recentAlerts.delete(key);
    }
  }

  return false;
}

function truncateStack(stack?: string): string {
  if (!stack) return 'No stack trace';
  return stack.length > MAX_STACK_LENGTH
    ? stack.slice(0, MAX_STACK_LENGTH) + '...'
    : stack;
}

async function sendSlackAlert(blocks: unknown[]): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    if (!loggedMissingWebhook) {
      logger.warn('SLACK_ALERT_WEBHOOK_URL not set — Slack alerts disabled');
      loggedMissingWebhook = true;
    }
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn(`Slack webhook returned ${res.status}`);
    }
  } catch (err) {
    logger.warn(`Slack alert failed: ${err instanceof Error ? err.message : err}`);
  }
}

export async function alertServerError(
  error: unknown,
  context?: { method?: string; url?: string },
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const sig = hashSignature(`server:${message}`);
  if (isRateLimited(sig)) return;

  const endpoint = context ? `${context.method || 'UNKNOWN'} ${context.url || ''}` : 'Unknown';

  await sendSlackAlert([
    {
      type: 'header',
      text: { type: 'plain_text', text: '🔴 Server Error — PlainLedger' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Endpoint:*\n\`${endpoint}\`` },
        { type: 'mrkdwn', text: `*Time:*\n${new Date().toISOString()}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Error:*\n${message}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Stack:*\n\`\`\`${truncateStack(stack)}\`\`\`` },
    },
  ]);
}

export async function alertDatabaseError(
  error: unknown,
  context?: string,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const sig = hashSignature(`db:${message}`);
  if (isRateLimited(sig)) return;

  await sendSlackAlert([
    {
      type: 'header',
      text: { type: 'plain_text', text: '🔴 Database Error — PlainLedger' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Context:*\n${context || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Time:*\n${new Date().toISOString()}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Error:*\n${message}` },
    },
  ]);
}

export async function alertHealthDegraded(
  service: string,
  details?: string,
): Promise<void> {
  const sig = hashSignature(`health:${service}`);
  if (isRateLimited(sig)) return;

  await sendSlackAlert([
    {
      type: 'header',
      text: { type: 'plain_text', text: '🟡 Service Degraded — PlainLedger' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Service:*\n${service}` },
        { type: 'mrkdwn', text: `*Time:*\n${new Date().toISOString()}` },
      ],
    },
    ...(details
      ? [{ type: 'section', text: { type: 'mrkdwn', text: `*Details:*\n${details}` } }]
      : []),
  ]);
}
