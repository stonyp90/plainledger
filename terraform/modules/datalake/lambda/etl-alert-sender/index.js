/**
 * ETL Alert Sender Lambda
 * 
 * Triggered by EventBridge when Glue jobs change state.
 * Formats and sends email alerts via AWS SES.
 * 
 * Event structure:
 * {
 *   "source": "aws.glue",
 *   "detail-type": "Glue Job State Change",
 *   "detail": {
 *     "jobName": "plainledger-prod-bronze-to-silver",
 *     "state": "SUCCEEDED" | "FAILED" | "TIMEOUT" | "STOPPED",
 *     "jobRunId": "jr_1234567890",
 *     "message": "Job succeeded",
 *     "startedOn": 1234567890,
 *     "completedOn": 1234567890
 *   }
 * }
 */

const AWS = require('aws-sdk');
const https = require('https');
const http = require('http');

const SES_REGION = process.env.SES_REGION || 'us-east-1';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@plainledger.ca';
const ALERT_EMAIL = process.env.ALERT_EMAIL;
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://api.plainledger.com';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

const ses = new AWS.SES({ region: SES_REGION });

/**
 * Generate email template HTML
 */
function generateEmailTemplate(templateType, data) {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f8fafc; }
      .stats { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; }
      .error { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 10px 0; }
      .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 10px 0; }
      .success { background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 10px 0; }
    </style>
  `;

  if (templateType === 'success') {
    const quarantineRate = data.recordsProcessed > 0 
      ? ((data.recordsQuarantined / data.recordsProcessed) * 100).toFixed(1)
      : '0.0';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ ETL Pipeline Completed Successfully</h1>
          </div>
          <div class="content">
            <p>Your data pipeline has completed successfully for <strong>${data.organizationName}</strong>.</p>
            <div class="success">
              <p><strong>Job:</strong> ${data.jobName}</p>
              <p><strong>Duration:</strong> ${data.duration}</p>
              <p><strong>Completed:</strong> ${data.timestamp}</p>
            </div>
            <div class="stats">
              <p><strong>Records Processed:</strong> ${data.recordsProcessed.toLocaleString()}</p>
              <p><strong>Records Written:</strong> ${data.recordsWritten.toLocaleString()}</p>
              <p><strong>Records Quarantined:</strong> ${data.recordsQuarantined.toLocaleString()} (${quarantineRate}%)</p>
            </div>
            ${parseFloat(quarantineRate) > 5 ? `
              <div class="warning">
                <strong>⚠️ High Quarantine Rate:</strong> ${quarantineRate}% of records were quarantined.
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  } else if (templateType === 'failure') {
    return `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
            <h1>✗ ETL Pipeline Failed</h1>
          </div>
          <div class="content">
            <p>Your data pipeline has failed for <strong>${data.organizationName}</strong>.</p>
            <div class="error">
              <p><strong>Job:</strong> ${data.jobName}</p>
              <p><strong>Failed:</strong> ${data.timestamp}</p>
              <p><strong>Status:</strong> ${data.retryable ? 'Retryable' : 'Permanent Failure'}</p>
            </div>
            <div class="error">
              <p><strong>Error:</strong></p>
              <pre style="background: #1e293b; color: #f1f5f9; padding: 10px; border-radius: 4px; overflow-x: auto;">${data.errorMessage}</pre>
            </div>
            ${data.errorDetails ? `
              <details>
                <summary>Stack Trace</summary>
                <pre style="background: #1e293b; color: #f1f5f9; padding: 10px; border-radius: 4px; overflow-x: auto;">${data.errorDetails}</pre>
              </details>
            ` : ''}
            ${data.retryable ? `
              <div class="success">
                <strong>ℹ️ Automatic Retry:</strong> This error is retryable. The pipeline will automatically retry.
              </div>
            ` : `
              <div class="error">
                <strong>⚠️ Manual Intervention Required:</strong> This is a permanent failure.
              </div>
            `}
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  return '<html><body><p>Unknown alert type</p></body></html>';
}

/**
 * Send email via SES
 */
async function sendEmail(to, subject, htmlBody) {
  const params = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  };

  return ses.sendEmail(params).promise();
}

/**
 * Extract organization ID from job name
 */
function extractOrgId(jobName) {
  // Pattern: plainledger-{env}-{job-type}-{orgId}
  const match = jobName.match(/-([a-z0-9-]+)$/);
  return match ? match[1] : 'unknown';
}

/**
 * Format duration from timestamps
 */
function formatDuration(startedOn, completedOn) {
  if (!startedOn || !completedOn) {
    return 'N/A';
  }
  
  const durationMs = completedOn - startedOn;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Determine alert type and route accordingly
 */
function routeAlert(eventDetail) {
  const state = eventDetail.state;
  const jobName = eventDetail.jobName || 'unknown';
  const orgId = extractOrgId(jobName);
  
  const baseData = {
    organizationName: orgId,
    jobName: jobName,
    timestamp: new Date(eventDetail.completedOn || Date.now()).toISOString(),
  };

  if (state === 'SUCCEEDED') {
    // Check if we need data quality alert (quarantine rate > 5%)
    // For now, send success alert
    return {
      type: 'success',
      subject: `✓ ETL Pipeline Completed: ${jobName}`,
      data: {
        ...baseData,
        duration: formatDuration(eventDetail.startedOn, eventDetail.completedOn),
        recordsProcessed: eventDetail.recordsProcessed || 0,
        recordsWritten: eventDetail.recordsWritten || 0,
        recordsQuarantined: eventDetail.recordsQuarantined || 0,
      },
    };
  } else if (state === 'FAILED') {
    return {
      type: 'failure',
      subject: `✗ ETL Pipeline Failed: ${jobName}`,
      data: {
        ...baseData,
        errorMessage: eventDetail.message || 'Unknown error',
        errorDetails: eventDetail.errorDetails || eventDetail.stackTrace,
        retryable: eventDetail.retryable !== false,
      },
    };
  } else if (state === 'TIMEOUT' || state === 'STOPPED') {
    return {
      type: 'failure',
      subject: `⚠ ETL Pipeline ${state}: ${jobName}`,
      data: {
        ...baseData,
        errorMessage: `Job ${state.toLowerCase()}`,
        retryable: true,
      },
    };
  }
  
  return null;
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('ETL Alert Sender triggered:', JSON.stringify(event, null, 2));
  
  try {
    if (!ALERT_EMAIL) {
      console.warn('ALERT_EMAIL not configured, skipping email send');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Alert email not configured' }),
      };
    }

    const eventDetail = event.detail || {};
    const alert = routeAlert(eventDetail);
    
    if (!alert) {
      console.log('No alert routing for event state:', eventDetail.state);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No alert needed' }),
      };
    }

    // Generate email template
    const htmlBody = generateEmailTemplate(alert.type, alert.data);

    // Send email via SES
    const result = await sendEmail(ALERT_EMAIL, alert.subject, htmlBody);
    
    console.log('Email sent successfully:', result.MessageId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Alert email sent',
        messageId: result.MessageId,
        alertType: alert.type,
      }),
    };
  } catch (error) {
    console.error('Failed to send alert email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send alert email',
        message: error.message,
      }),
    };
  }
};
