/**
 * Upgrade Request Form Component
 * Email capture form for upgrade requests (alternative to Calendly)
 * Submits to CRM (HubSpot) for async lead capture
 */

import { useState } from 'react';
import { Mail, Send, CheckCircle, Loader2, Calendar, ArrowRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { crmService } from '../lib/crm';

interface UpgradeRequestFormProps {
  /** Feature that triggered the upgrade request */
  feature?: string;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Show Calendly option alongside email form */
  showCalendlyOption?: boolean;
  /** Callback when form is submitted */
  onSubmitted?: () => void;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function UpgradeRequestForm({
  feature,
  compact = false,
  showCalendlyOption = true,
  onSubmitted,
  title,
  description,
}: UpgradeRequestFormProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    role: '',
    useCase: '',
  });
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrorMessage(isEn ? 'Email is required' : 'Le courriel est requis');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Submit to CRM (HubSpot form)
      const success = await crmService.submitHubSpotForm('upgrade-request', {
        email: formData.email,
        firstname: formData.firstName,
        lastname: formData.lastName,
        company: formData.company,
        jobtitle: formData.role,
        message: formData.useCase || `Interested in upgrading for ${feature || 'premium features'}`,
        feature_requested: feature || 'general',
        source: 'upgrade_form',
      });

      if (success) {
        setStatus('success');
        // Track in CRM
        await crmService.trackSignup({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          source: 'direct',
        });
        
        if (onSubmitted) {
          onSubmitted();
        }
      } else {
        setStatus('error');
        setErrorMessage(isEn ? 'Failed to submit. Please try again.' : 'Échec de l\'envoi. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      setStatus('error');
      setErrorMessage(isEn ? 'An error occurred. Please try again.' : 'Une erreur s\'est produite. Veuillez réessayer.');
    }
  };

  const handleCalendlyClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  // Success state
  if (status === 'success') {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} rounded-xl text-center`}
        style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', border: '1px solid rgb(var(--color-success) / 0.3)' }}>
        <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--color-success))' }} />
        <h3 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Request Received!' : 'Demande reçue!'}
        </h3>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn 
            ? 'Our team will contact you within 24 hours to discuss your upgrade options.'
            : 'Notre équipe vous contactera dans les 24 heures pour discuter de vos options de mise à niveau.'}
        </p>
      </div>
    );
  }

  // Compact mode
  if (compact) {
    return (
      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={isEn ? 'your@email.com' : 'votre@courriel.com'}
            required
            className="w-full px-4 py-2 rounded-lg text-sm"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
              border: '1px solid rgb(var(--color-border))'
            }}
          />
          {errorMessage && (
            <p className="text-xs" style={{ color: 'rgb(var(--color-error))' }}>
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
              opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEn ? 'Sending...' : 'Envoi...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isEn ? 'Request Upgrade' : 'Demander mise à niveau'}
              </>
            )}
          </button>
        </form>
        
        {showCalendlyOption && (
          <div className="text-center">
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'or' : 'ou'}
            </span>
            <button
              onClick={handleCalendlyClick}
              className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            >
              <Calendar className="w-4 h-4" />
              {isEn ? 'Schedule a Call' : 'Planifier un appel'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full form mode
  return (
    <div className="rounded-xl p-6 text-left" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Mail className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {title || (isEn ? 'Request Upgrade Information' : 'Demander des informations de mise à niveau')}
          </h3>
        </div>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {description || (isEn 
            ? 'Fill out the form below and we\'ll send you detailed feature information and schedule a demo call.'
            : 'Remplissez le formulaire ci-dessous et nous vous enverrons des informations détaillées sur les fonctionnalités et planifierons un appel de démonstration.')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'First Name' : 'Prénom'} *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Last Name' : 'Nom'} *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Email' : 'Courriel'} *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full px-4 py-2.5 rounded-lg text-sm"
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text))',
              border: '1px solid rgb(var(--color-border))'
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Company' : 'Entreprise'}
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Role' : 'Rôle'}
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder={isEn ? 'e.g., CFO, Controller' : 'ex: DAF, Contrôleur'}
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Use Case' : 'Cas d\'utilisation'}
          </label>
          <textarea
            value={formData.useCase}
            onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
            rows={3}
            placeholder={isEn ? 'Tell us about your needs...' : 'Parlez-nous de vos besoins...'}
            className="w-full px-4 py-2.5 rounded-lg text-sm resize-none"
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text))',
              border: '1px solid rgb(var(--color-border))'
            }}
          />
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' }}>
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
              opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEn ? 'Sending...' : 'Envoi...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {isEn ? 'Request Information' : 'Demander des infos'}
              </>
            )}
          </button>
          
          {showCalendlyOption && (
            <button
              type="button"
              onClick={handleCalendlyClick}
              className="px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            >
              <Calendar className="w-5 h-5" />
              {isEn ? 'Schedule Call' : 'Planifier un appel'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
