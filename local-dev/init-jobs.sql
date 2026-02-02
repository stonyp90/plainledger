-- PlainLedger Jobs Configuration Schema
-- Allows super admins to configure scheduled jobs via the UI

-- Create system schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS system;

-- ============================================
-- JOB CONFIGURATION
-- ============================================

-- Job definitions and configuration
CREATE TABLE IF NOT EXISTS system.job_configurations (
    id VARCHAR(100) PRIMARY KEY,
    
    -- Job Info
    name_en VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_fr TEXT,
    category VARCHAR(50) NOT NULL, -- 'sync', 'cleanup', 'reporting', 'ai', 'notifications'
    
    -- Schedule Configuration
    is_enabled BOOLEAN DEFAULT true,
    cron_expression VARCHAR(100) NOT NULL, -- Standard cron format
    timezone VARCHAR(50) DEFAULT 'America/Toronto',
    
    -- Execution Settings
    timeout_seconds INTEGER DEFAULT 3600, -- 1 hour default
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 300, -- 5 minutes
    
    -- Alert Configuration
    alert_on_failure BOOLEAN DEFAULT true,
    alert_on_success BOOLEAN DEFAULT false,
    alert_on_changes_detected BOOLEAN DEFAULT true,
    alert_emails TEXT[], -- Array of email addresses
    alert_slack_webhook VARCHAR(500),
    
    -- Metadata
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(20), -- 'success', 'failed', 'partial', 'skipped'
    last_run_duration_ms INTEGER,
    last_run_result JSONB,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_job_configurations_category ON system.job_configurations(category);
CREATE INDEX idx_job_configurations_enabled ON system.job_configurations(is_enabled);
CREATE INDEX idx_job_configurations_next_run ON system.job_configurations(next_run_at);

-- Job execution history
CREATE TABLE IF NOT EXISTS system.job_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) NOT NULL REFERENCES system.job_configurations(id),
    
    -- Execution Details
    run_id VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(20) NOT NULL, -- 'scheduled', 'manual', 'retry'
    triggered_by VARCHAR(100), -- User ID if manual
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Results
    result JSONB,
    error_message TEXT,
    
    -- Alerts Sent
    alerts_sent JSONB -- { email: [...], slack: boolean }
);

CREATE INDEX idx_job_executions_job ON system.job_executions(job_id);
CREATE INDEX idx_job_executions_status ON system.job_executions(status);
CREATE INDEX idx_job_executions_started ON system.job_executions(started_at DESC);

-- Alert templates
CREATE TABLE IF NOT EXISTS system.alert_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject_en VARCHAR(255) NOT NULL,
    subject_fr VARCHAR(255) NOT NULL,
    body_html_en TEXT NOT NULL,
    body_html_fr TEXT NOT NULL,
    variables TEXT[], -- Expected template variables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SEED DEFAULT JOB CONFIGURATIONS
-- ============================================

INSERT INTO system.job_configurations (
    id, name_en, name_fr, description_en, description_fr, category,
    is_enabled, cron_expression, timeout_seconds,
    alert_on_failure, alert_on_success, alert_on_changes_detected,
    alert_emails
) VALUES
    -- Tax Credit Sync (Daily)
    ('tax_credit_sync', 
     'Tax Credit Government Sync',
     'Synchronisation des crédits d''impôt gouvernementaux',
     'Checks CRA, Revenu Quebec, Ontario Creates and other government sources for tax credit updates. Alerts when changes are detected so credits can be manually reviewed and updated.',
     'Vérifie les sources gouvernementales (ARC, Revenu Québec, Ontario Creates) pour les mises à jour des crédits d''impôt. Alerte lorsque des changements sont détectés.',
     'sync',
     true, '0 4 * * *', 1800, -- Daily at 4 AM, 30 min timeout
     true, false, true,
     ARRAY['admin@plainledger.com']),
    
    -- Data Retention Cleanup (Daily)
    ('data_retention',
     'Data Retention Cleanup',
     'Nettoyage de rétention des données',
     'Removes soft-deleted organizations past the 90-day grace period, cleans old Bronze layer data, and ensures GDPR/PIPEDA compliance.',
     'Supprime les organisations supprimées après la période de grâce de 90 jours, nettoie les anciennes données Bronze et assure la conformité RGPD/LPRPDE.',
     'cleanup',
     true, '0 2 * * *', 3600, -- Daily at 2 AM, 1 hour timeout
     true, false, false,
     ARRAY['admin@plainledger.com']),
    
    -- Customer Journey Analysis (Daily)
    ('customer_journey',
     'Customer Journey Analysis',
     'Analyse du parcours client',
     'Analyzes user activity patterns and updates journey stage for each organization. Powers the adoption dashboard.',
     'Analyse les modèles d''activité des utilisateurs et met à jour l''étape du parcours pour chaque organisation.',
     'ai',
     true, '0 3 * * *', 1800, -- Daily at 3 AM, 30 min timeout
     true, false, false,
     ARRAY['admin@plainledger.com']),
    
    -- Weekly AI Model Retraining
    ('weekly_retraining',
     'AI Model Retraining',
     'Réentraînement des modèles IA',
     'Retrains anomaly detection and categorization models with new data. Improves prediction accuracy over time.',
     'Réentraîne les modèles de détection d''anomalies et de catégorisation avec les nouvelles données.',
     'ai',
     true, '0 1 * * 0', 7200, -- Weekly Sunday 1 AM, 2 hour timeout
     true, true, false,
     ARRAY['admin@plainledger.com']),
    
    -- Subscription Reminders
    ('subscription_reminders',
     'Subscription Expiry Reminders',
     'Rappels d''expiration d''abonnement',
     'Sends reminder emails to users whose subscriptions are about to expire.',
     'Envoie des courriels de rappel aux utilisateurs dont les abonnements arrivent à expiration.',
     'notifications',
     true, '0 9 * * *', 600, -- Daily at 9 AM, 10 min timeout
     true, false, false,
     ARRAY['admin@plainledger.com']),
    
    -- Benchmark Data Refresh
    ('benchmark_refresh',
     'Industry Benchmark Refresh',
     'Actualisation des benchmarks industriels',
     'Updates industry benchmark data from Statistics Canada and other sources.',
     'Met à jour les données de référence de l''industrie à partir de Statistique Canada.',
     'sync',
     true, '0 5 * * 1', 1800, -- Weekly Monday 5 AM, 30 min timeout
     true, false, true,
     ARRAY['admin@plainledger.com'])

ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_fr = EXCLUDED.name_fr,
    description_en = EXCLUDED.description_en,
    description_fr = EXCLUDED.description_fr,
    updated_at = NOW();

-- ============================================
-- SEED ALERT TEMPLATES
-- ============================================

INSERT INTO system.alert_templates (id, name, subject_en, subject_fr, body_html_en, body_html_fr, variables)
VALUES
    ('job_failed',
     'Job Failed Alert',
     '[PlainLedger] Job Failed: {{job_name}}',
     '[PlainLedger] Échec de la tâche: {{job_name}}',
     '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #dc2626;">⚠️ Job Failed</h2>
    <p>The scheduled job <strong>{{job_name}}</strong> has failed.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Job ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{job_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Run ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{run_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Started:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{started_at}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Duration:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{duration}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Error:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">{{error_message}}</td></tr>
    </table>
    <p>Please investigate and take appropriate action.</p>
    <p style="color: #6b7280; font-size: 14px;">— PlainLedger System</p>
  </div>
</body>
</html>',
     '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #dc2626;">⚠️ Échec de la tâche</h2>
    <p>La tâche planifiée <strong>{{job_name}}</strong> a échoué.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>ID de tâche:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{job_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>ID d''exécution:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{run_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Démarré:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{started_at}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Durée:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{duration}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Erreur:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">{{error_message}}</td></tr>
    </table>
    <p>Veuillez enquêter et prendre les mesures appropriées.</p>
    <p style="color: #6b7280; font-size: 14px;">— Système PlainLedger</p>
  </div>
</body>
</html>',
     ARRAY['job_id', 'job_name', 'run_id', 'started_at', 'duration', 'error_message']),

    ('changes_detected',
     'Changes Detected Alert',
     '[PlainLedger] Changes Detected: {{job_name}}',
     '[PlainLedger] Changements détectés: {{job_name}}',
     '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #f59e0b;">🔔 Changes Detected</h2>
    <p>The job <strong>{{job_name}}</strong> has detected changes that require your attention.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Job ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{job_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Run ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{run_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Completed:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{completed_at}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Changes:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{changes_count}} source(s)</td></tr>
    </table>
    <h3>Sources with Changes:</h3>
    <ul>{{changes_list}}</ul>
    <p><strong>Action Required:</strong> Please review the changes and update the affected records as needed.</p>
    <p style="color: #6b7280; font-size: 14px;">— PlainLedger System</p>
  </div>
</body>
</html>',
     '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #f59e0b;">🔔 Changements détectés</h2>
    <p>La tâche <strong>{{job_name}}</strong> a détecté des changements qui nécessitent votre attention.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>ID de tâche:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{job_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>ID d''exécution:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{run_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Terminé:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{completed_at}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Changements:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{changes_count}} source(s)</td></tr>
    </table>
    <h3>Sources avec changements:</h3>
    <ul>{{changes_list}}</ul>
    <p><strong>Action requise:</strong> Veuillez examiner les changements et mettre à jour les enregistrements concernés.</p>
    <p style="color: #6b7280; font-size: 14px;">— Système PlainLedger</p>
  </div>
</body>
</html>',
     ARRAY['job_id', 'job_name', 'run_id', 'completed_at', 'changes_count', 'changes_list']),

    ('job_success',
     'Job Success Alert',
     '[PlainLedger] Job Completed: {{job_name}}',
     '[PlainLedger] Tâche terminée: {{job_name}}',
     '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #16a34a;">✅ Job Completed Successfully</h2>
    <p>The scheduled job <strong>{{job_name}}</strong> has completed successfully.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Job ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{job_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Run ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{run_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Completed:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{completed_at}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Duration:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{duration}}</td></tr>
    </table>
    {{#if summary}}<h3>Summary:</h3><pre style="background: #f3f4f6; padding: 12px; border-radius: 4px;">{{summary}}</pre>{{/if}}
    <p style="color: #6b7280; font-size: 14px;">— PlainLedger System</p>
  </div>
</body>
</html>',
     '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #16a34a;">✅ Tâche terminée avec succès</h2>
    <p>La tâche planifiée <strong>{{job_name}}</strong> s''est terminée avec succès.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>ID de tâche:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{job_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>ID d''exécution:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{run_id}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Terminé:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{completed_at}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Durée:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{duration}}</td></tr>
    </table>
    {{#if summary}}<h3>Résumé:</h3><pre style="background: #f3f4f6; padding: 12px; border-radius: 4px;">{{summary}}</pre>{{/if}}
    <p style="color: #6b7280; font-size: 14px;">— Système PlainLedger</p>
  </div>
</body>
</html>',
     ARRAY['job_id', 'job_name', 'run_id', 'completed_at', 'duration', 'summary'])

ON CONFLICT (id) DO UPDATE SET
    subject_en = EXCLUDED.subject_en,
    subject_fr = EXCLUDED.subject_fr,
    body_html_en = EXCLUDED.body_html_en,
    body_html_fr = EXCLUDED.body_html_fr,
    updated_at = NOW();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON system.job_configurations TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.job_executions TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.alert_templates TO plainledger;
