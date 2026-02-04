/**
 * JobsSettings - Admin UI for managing scheduled jobs
 * 
 * Features:
 * - View all scheduled jobs
 * - Enable/disable jobs
 * - Configure alert settings
 * - View execution history
 * - Manually trigger jobs
 * 
 * Bilingual support (EN/FR)
 */

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../lib/i18n';
import { adminJobsApi, JobConfiguration, JobExecution } from '../lib/api';

interface JobsSettingsProps {
  userRole?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  sync: '🔄',
  cleanup: '🧹',
  reporting: '📊',
  ai: '🤖',
  notifications: '📧',
};

const CATEGORY_COLORS: Record<string, string> = {
  sync: 'bg-blue-100 text-blue-800',
  cleanup: 'bg-purple-100 text-purple-800',
  reporting: 'bg-primary-100 text-primary-800',
  ai: 'bg-amber-100 text-amber-800',
  notifications: 'bg-pink-100 text-pink-800',
};

export function JobsSettings({ userRole }: JobsSettingsProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';

  const [jobs, setJobs] = useState<JobConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobConfiguration | null>(null);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState<Partial<JobConfiguration>>({});

  // Fetch all jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminJobsApi.getAll();
      setJobs(response.data || []);
      setError(null);
    } catch (err) {
      setError(isEn ? 'Failed to load jobs' : 'Échec du chargement des tâches');
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  // Fetch job executions
  const fetchExecutions = useCallback(async (jobId: string) => {
    try {
      const response = await adminJobsApi.getExecutions(jobId, 10);
      setExecutions(response.data || []);
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchJobs();
    }
  }, [isSuperAdmin, fetchJobs]);

  // Select job and load executions
  const handleSelectJob = (job: JobConfiguration) => {
    setSelectedJob(job);
    setEditingJob(null);
    fetchExecutions(job.id);
  };

  // Start editing a job
  const handleEditJob = (job: JobConfiguration) => {
    setEditingJob(job.id);
    setFormData({
      cronExpression: job.cronExpression,
      timezone: job.timezone,
      timeoutSeconds: job.timeoutSeconds,
      maxRetries: job.maxRetries,
      alertOnFailure: job.alertOnFailure,
      alertOnSuccess: job.alertOnSuccess,
      alertOnChangesDetected: job.alertOnChangesDetected,
      alertEmails: job.alertEmails,
      alertSlackWebhook: job.alertSlackWebhook,
    });
  };

  // Save job configuration
  const handleSaveJob = async () => {
    if (!editingJob) return;

    setSaving(true);
    try {
      const response = await adminJobsApi.update(editingJob, formData);
      setJobs(jobs.map(j => j.id === editingJob ? response.data : j));
      setSelectedJob(response.data);
      setEditingJob(null);
      setError(null);
    } catch (err) {
      setError(isEn ? 'Failed to save job' : 'Échec de la sauvegarde');
      console.error('Failed to save job:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle job enabled/disabled
  const handleToggleJob = async (jobId: string) => {
    try {
      const response = await adminJobsApi.toggle(jobId);
      setJobs(jobs.map(j => j.id === jobId ? response.data : j));
      if (selectedJob?.id === jobId) {
        setSelectedJob(response.data);
      }
    } catch (err) {
      setError(isEn ? 'Failed to toggle job' : 'Échec du basculement');
      console.error('Failed to toggle job:', err);
    }
  };

  // Manually trigger job
  const handleTriggerJob = async (jobId: string) => {
    try {
      await adminJobsApi.trigger(jobId);
      fetchExecutions(jobId);
      alert(isEn ? 'Job triggered successfully' : 'Tâche déclenchée avec succès');
    } catch (err) {
      setError(isEn ? 'Failed to trigger job' : 'Échec du déclenchement');
      console.error('Failed to trigger job:', err);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(isEn ? 'en-CA' : 'fr-CA');
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  // Parse cron for display
  const describeCron = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length < 5) return cron;
    
    const [min, hour, dom, , dow] = parts;
    
    if (dom === '*' && dow === '*') {
      return isEn ? `Daily at ${hour}:${min.padStart(2, '0')}` : `Quotidien à ${hour}h${min.padStart(2, '0')}`;
    }
    if (dow === '0') {
      return isEn ? `Weekly (Sun) at ${hour}:${min.padStart(2, '0')}` : `Hebdo (dim) à ${hour}h${min.padStart(2, '0')}`;
    }
    if (dow === '1') {
      return isEn ? `Weekly (Mon) at ${hour}:${min.padStart(2, '0')}` : `Hebdo (lun) à ${hour}h${min.padStart(2, '0')}`;
    }
    return cron;
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">
          {isEn
            ? 'You need super admin access to manage scheduled jobs.'
            : 'Vous devez avoir un accès super admin pour gérer les tâches planifiées.'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isEn ? 'Scheduled Jobs' : 'Tâches planifiées'}
          </h3>
          <p className="text-sm text-gray-600">
            {isEn
              ? 'Configure and monitor automated system tasks'
              : 'Configurez et surveillez les tâches système automatisées'}
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          {isEn ? 'Refresh' : 'Actualiser'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs List */}
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => handleSelectJob(job)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedJob?.id === job.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{CATEGORY_ICONS[job.category]}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {isEn ? job.nameEn : job.nameFr}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {describeCron(job.cronExpression)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      CATEGORY_COLORS[job.category]
                    }`}
                  >
                    {job.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleJob(job.id);
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                      job.isEnabled
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {job.isEnabled
                      ? isEn ? 'Enabled' : 'Activé'
                      : isEn ? 'Disabled' : 'Désactivé'}
                  </button>
                </div>
              </div>
              
              {/* Status */}
              {job.lastRunAt && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    {isEn ? 'Last run:' : 'Dernière exécution:'}{' '}
                    {formatDate(job.lastRunAt)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      job.lastRunStatus === 'success'
                        ? 'bg-primary-100 text-primary-700'
                        : job.lastRunStatus === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {job.lastRunStatus || 'unknown'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Job Details */}
        {selectedJob && (
          <div className="border rounded-lg bg-white p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">
                {isEn ? selectedJob.nameEn : selectedJob.nameFr}
              </h4>
              <div className="flex gap-2">
                {editingJob !== selectedJob.id ? (
                  <>
                    <button
                      onClick={() => handleEditJob(selectedJob)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      {isEn ? 'Edit' : 'Modifier'}
                    </button>
                    <button
                      onClick={() => handleTriggerJob(selectedJob.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                    >
                      {isEn ? 'Run Now' : 'Exécuter'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingJob(null)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      {isEn ? 'Cancel' : 'Annuler'}
                    </button>
                    <button
                      onClick={handleSaveJob}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded-md disabled:opacity-50"
                    >
                      {saving ? '...' : isEn ? 'Save' : 'Sauvegarder'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {isEn ? selectedJob.descriptionEn : selectedJob.descriptionFr}
            </p>

            {/* Edit Form or View */}
            {editingJob === selectedJob.id ? (
              <div className="space-y-4">
                {/* Cron Expression */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEn ? 'Schedule (Cron)' : 'Horaire (Cron)'}
                  </label>
                  <input
                    type="text"
                    value={formData.cronExpression || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, cronExpression: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="0 4 * * *"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isEn ? 'Format: minute hour day month weekday' : 'Format: minute heure jour mois jour_semaine'}
                  </p>
                </div>

                {/* Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEn ? 'Timeout (seconds)' : 'Délai d\'expiration (secondes)'}
                  </label>
                  <input
                    type="number"
                    value={formData.timeoutSeconds || 1800}
                    onChange={(e) =>
                      setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Alerts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isEn ? 'Alert Settings' : 'Paramètres d\'alerte'}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.alertOnFailure ?? true}
                        onChange={(e) =>
                          setFormData({ ...formData, alertOnFailure: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm">
                        {isEn ? 'Alert on failure' : 'Alerter en cas d\'échec'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.alertOnSuccess ?? false}
                        onChange={(e) =>
                          setFormData({ ...formData, alertOnSuccess: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm">
                        {isEn ? 'Alert on success' : 'Alerter en cas de succès'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.alertOnChangesDetected ?? true}
                        onChange={(e) =>
                          setFormData({ ...formData, alertOnChangesDetected: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm">
                        {isEn ? 'Alert when changes detected' : 'Alerter lorsque des changements sont détectés'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Alert Emails */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEn ? 'Alert Emails (comma separated)' : 'Courriels d\'alerte (séparés par virgule)'}
                  </label>
                  <input
                    type="text"
                    value={(formData.alertEmails || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        alertEmails: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="admin@example.com, ops@example.com"
                  />
                </div>

                {/* Slack Webhook */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEn ? 'Slack Webhook URL' : 'URL Webhook Slack'}
                  </label>
                  <input
                    type="text"
                    value={formData.alertSlackWebhook || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, alertSlackWebhook: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="https://hooks.slack.com/..."
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{isEn ? 'Schedule:' : 'Horaire:'}</span>
                    <p className="font-medium">{describeCron(selectedJob.cronExpression)}</p>
                    <p className="text-xs text-gray-400">{selectedJob.cronExpression}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isEn ? 'Timeout:' : 'Délai:'}</span>
                    <p className="font-medium">{selectedJob.timeoutSeconds}s</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isEn ? 'Last Run:' : 'Dernière exécution:'}</span>
                    <p className="font-medium">{formatDate(selectedJob.lastRunAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isEn ? 'Duration:' : 'Durée:'}</span>
                    <p className="font-medium">{formatDuration(selectedJob.lastRunDurationMs)}</p>
                  </div>
                </div>

                {/* Alert Config */}
                <div className="pt-4 border-t">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    {isEn ? 'Alert Configuration' : 'Configuration des alertes'}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.alertOnFailure && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                        {isEn ? 'On Failure' : 'Échec'}
                      </span>
                    )}
                    {selectedJob.alertOnSuccess && (
                      <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                        {isEn ? 'On Success' : 'Succès'}
                      </span>
                    )}
                    {selectedJob.alertOnChangesDetected && (
                      <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
                        {isEn ? 'On Changes' : 'Changements'}
                      </span>
                    )}
                  </div>
                  {selectedJob.alertEmails.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {isEn ? 'Recipients:' : 'Destinataires:'} {selectedJob.alertEmails.join(', ')}
                    </p>
                  )}
                  {selectedJob.alertSlackWebhook && (
                    <p className="text-xs text-gray-500">
                      {isEn ? 'Slack: Configured' : 'Slack: Configuré'} ✓
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Execution History */}
            {executions.length > 0 && (
              <div className="pt-4 border-t">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  {isEn ? 'Recent Executions' : 'Exécutions récentes'}
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {executions.map((exec) => (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            exec.status === 'completed'
                              ? 'bg-primary-500'
                              : exec.status === 'failed'
                              ? 'bg-red-500'
                              : exec.status === 'running'
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-gray-400'
                          }`}
                        />
                        <span className="text-gray-600">
                          {formatDate(exec.startedAt)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({exec.triggerType})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {formatDuration(exec.durationMs)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded ${
                            exec.status === 'completed'
                              ? 'bg-primary-100 text-primary-700'
                              : exec.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {exec.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default JobsSettings;
