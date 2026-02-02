/**
 * ContactForm Component
 * 
 * Reusable contact form that submits to the API.
 * Used in both the Landing page (website) and HelpCenter (app).
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Loader2, User, Mail, Tag, MessageSquare, Building2, Phone, Briefcase, HelpCircle } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import config from '../lib/config';

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  industry: string;
  subject: string;
  message: string;
  referralSource: string;
}

interface FieldFocus {
  name: boolean;
  email: boolean;
  company: boolean;
  phone: boolean;
  industry: boolean;
  subject: boolean;
  message: boolean;
  referralSource: boolean;
}

interface ContactFormProps {
  /** Source identifier for tracking (e.g., 'website', 'app', 'help-center') */
  source?: string;
  /** Optional callback when form is successfully submitted */
  onSuccess?: () => void;
  /** Whether to use the landing page theme styling */
  landingStyle?: boolean;
  /** Theme colors for landing page variant */
  theme?: {
    green: string;
    greenDark: string;
    greenLight: string;
  };
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function ContactForm({ 
  source = 'website', 
  onSuccess,
  landingStyle = false,
  theme
}: ContactFormProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    industry: '',
    subject: '',
    message: '',
    referralSource: '',
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // App/HelpCenter styles hooks (must be before early return)
  const [fieldFocus, setFieldFocus] = useState<FieldFocus>({
    name: false,
    email: false,
    company: false,
    phone: false,
    industry: false,
    subject: false,
    message: false,
    referralSource: false,
  });
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`${config.api.baseUrl}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setStatus('success');
      setFormData({ name: '', email: '', company: '', phone: '', industry: '', subject: '', message: '', referralSource: '' });
      onSuccess?.();
      
      // Reset to idle after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setStatus('error');
      setErrorMessage(
        isEn 
          ? 'Something went wrong. Please try again or email us directly.' 
          : 'Une erreur s\'est produite. Veuillez réessayer ou nous envoyer un courriel.'
      );
    }
  };

  const subjects = [
    { value: '', label: isEn ? 'Select a subject...' : 'Sélectionnez un sujet...' },
    { value: 'general', label: isEn ? 'General Inquiry' : 'Demande générale' },
    { value: 'demo', label: isEn ? 'Request a Demo' : 'Demander une démo' },
    { value: 'support', label: isEn ? 'Technical Support' : 'Support technique' },
    { value: 'billing', label: isEn ? 'Billing Question' : 'Question de facturation' },
    { value: 'partnership', label: isEn ? 'Partnership Opportunity' : 'Opportunité de partenariat' },
    { value: 'feedback', label: isEn ? 'Feedback' : 'Commentaires' },
  ];

  const industries = [
    { value: '', label: isEn ? 'Select your industry...' : 'Sélectionnez votre industrie...' },
    { value: 'accounting', label: isEn ? 'Accounting / CPA Firm' : 'Comptabilité / Cabinet CPA' },
    { value: 'construction', label: isEn ? 'Construction' : 'Construction' },
    { value: 'healthcare', label: isEn ? 'Healthcare' : 'Santé' },
    { value: 'manufacturing', label: isEn ? 'Manufacturing' : 'Fabrication' },
    { value: 'professional-services', label: isEn ? 'Professional Services' : 'Services professionnels' },
    { value: 'real-estate', label: isEn ? 'Real Estate' : 'Immobilier' },
    { value: 'retail', label: isEn ? 'Retail / E-commerce' : 'Commerce de détail' },
    { value: 'restaurant', label: isEn ? 'Restaurant / Hospitality' : 'Restauration / Hôtellerie' },
    { value: 'technology', label: isEn ? 'Technology / SaaS' : 'Technologie / SaaS' },
    { value: 'transportation', label: isEn ? 'Transportation / Logistics' : 'Transport / Logistique' },
    { value: 'nonprofit', label: isEn ? 'Non-profit' : 'Organisme à but non lucratif' },
    { value: 'other', label: isEn ? 'Other' : 'Autre' },
  ];

  const referralSources = [
    { value: '', label: isEn ? 'How did you hear about us?' : 'Comment avez-vous entendu parler de nous?' },
    { value: 'google', label: isEn ? 'Google Search' : 'Recherche Google' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'referral', label: isEn ? 'Referral / Word of mouth' : 'Référence / Bouche à oreille' },
    { value: 'accountant', label: isEn ? 'My Accountant / CPA' : 'Mon comptable / CPA' },
    { value: 'social', label: isEn ? 'Social Media' : 'Médias sociaux' },
    { value: 'event', label: isEn ? 'Conference / Event' : 'Conférence / Événement' },
    { value: 'other', label: isEn ? 'Other' : 'Autre' },
  ];

  // Landing page styles
  if (landingStyle && theme) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label 
              htmlFor="contact-name" 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Name' : 'Nom'} *
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
                '--tw-ring-color': theme.green,
              } as React.CSSProperties}
              placeholder={isEn ? 'Your name' : 'Votre nom'}
            />
          </div>
          <div>
            <label 
              htmlFor="contact-email" 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Email' : 'Courriel'} *
            </label>
            <input
              id="contact-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
                '--tw-ring-color': theme.green,
              } as React.CSSProperties}
              placeholder={isEn ? 'your@email.com' : 'votre@courriel.com'}
            />
          </div>
        </div>

        {/* Company & Phone Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label 
              htmlFor="contact-company" 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Company' : 'Entreprise'} *
            </label>
            <input
              id="contact-company"
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
                '--tw-ring-color': theme.green,
              } as React.CSSProperties}
              placeholder={isEn ? 'Your company name' : 'Nom de votre entreprise'}
            />
          </div>
          <div>
            <label 
              htmlFor="contact-phone" 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Phone' : 'Téléphone'} <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>({isEn ? 'optional' : 'optionnel'})</span>
            </label>
            <input
              id="contact-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
                '--tw-ring-color': theme.green,
              } as React.CSSProperties}
              placeholder={isEn ? '(555) 123-4567' : '(555) 123-4567'}
            />
          </div>
        </div>

        {/* Industry & Subject Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label 
              htmlFor="contact-industry" 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Industry' : 'Industrie'} *
            </label>
            <select
              id="contact-industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
                '--tw-ring-color': theme.green,
              } as React.CSSProperties}
            >
              {industries.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label 
              htmlFor="contact-subject" 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Subject' : 'Sujet'} *
            </label>
            <select
              id="contact-subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
                '--tw-ring-color': theme.green,
              } as React.CSSProperties}
            >
              {subjects.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Message */}
        <div>
          <label 
            htmlFor="contact-message" 
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Message' : 'Message'} *
          </label>
          <textarea
            id="contact-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            minLength={10}
            maxLength={5000}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 resize-none"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
              '--tw-ring-color': theme.green,
            } as React.CSSProperties}
            placeholder={isEn ? 'How can we help you?' : 'Comment pouvons-nous vous aider?'}
          />
        </div>

        {/* How did you hear about us */}
        <div>
          <label 
            htmlFor="contact-referral" 
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'How did you hear about us?' : 'Comment avez-vous entendu parler de nous?'} <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>({isEn ? 'optional' : 'optionnel'})</span>
          </label>
          <select
            id="contact-referral"
            name="referralSource"
            value={formData.referralSource}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
              '--tw-ring-color': theme.green,
            } as React.CSSProperties}
          >
            {referralSources.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ backgroundColor: `${theme.green}15` }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: theme.green }} />
              <span style={{ color: theme.green }}>
                {isEn 
                  ? 'Thank you! We\'ll get back to you soon.' 
                  : 'Merci! Nous vous répondrons bientôt.'}
              </span>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-600 dark:text-red-400">{errorMessage}</span>
            </motion.div>
          ) : (
            <motion.button
              type="submit"
              disabled={status === 'submitting'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-70"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 20px ${theme.green}40`,
              }}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? 'Sending...' : 'Envoi...'}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {isEn ? 'Send Message' : 'Envoyer le message'}
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </form>
    );
  }


  const handleFocus = (field: keyof FieldFocus) => {
    setFieldFocus(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof FieldFocus) => {
    setFieldFocus(prev => ({ ...prev, [field]: false }));
  };

  const getInputStyle = (field: keyof FieldFocus, hasValue: boolean) => ({
    backgroundColor: 'rgb(var(--color-background))',
    borderColor: fieldFocus[field] 
      ? 'rgb(var(--color-primary-500))' 
      : hasValue 
        ? 'rgb(var(--color-border-strong))' 
        : 'rgb(var(--color-border))',
    color: 'rgb(var(--color-text))',
    boxShadow: fieldFocus[field] 
      ? '0 0 0 3px rgb(var(--color-primary-500) / 0.1)' 
      : 'none',
  });

  const maxMessageLength = 5000;
  const messageLength = formData.message.length;
  const isNearLimit = messageLength > maxMessageLength * 0.8;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Name Field */}
        <div className="space-y-1.5">
          <label 
            htmlFor="contact-name-app" 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: fieldFocus.name ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Name' : 'Nom'} <span style={{ color: 'rgb(var(--color-primary-500))' }}>*</span>
          </label>
          <div className="relative">
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{ color: fieldFocus.name ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
            >
              <User className="w-4 h-4" />
            </div>
            <input
              id="contact-name-app"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onFocus={() => handleFocus('name')}
              onBlur={() => handleBlur('name')}
              required
              minLength={2}
              maxLength={100}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none"
              style={getInputStyle('name', !!formData.name)}
              placeholder={isEn ? 'Your name' : 'Votre nom'}
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label 
            htmlFor="contact-email-app" 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: fieldFocus.email ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Email' : 'Courriel'} <span style={{ color: 'rgb(var(--color-primary-500))' }}>*</span>
          </label>
          <div className="relative">
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{ color: fieldFocus.email ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
            >
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="contact-email-app"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => handleFocus('email')}
              onBlur={() => handleBlur('email')}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none"
              style={getInputStyle('email', !!formData.email)}
              placeholder={isEn ? 'your@email.com' : 'votre@courriel.com'}
            />
          </div>
        </div>
      </div>

      {/* Company & Phone Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Company Field */}
        <div className="space-y-1.5">
          <label 
            htmlFor="contact-company-app" 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: fieldFocus.company ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Company' : 'Entreprise'} <span style={{ color: 'rgb(var(--color-primary-500))' }}>*</span>
          </label>
          <div className="relative">
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{ color: fieldFocus.company ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <input
              id="contact-company-app"
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              onFocus={() => handleFocus('company')}
              onBlur={() => handleBlur('company')}
              required
              maxLength={200}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none"
              style={getInputStyle('company', !!formData.company)}
              placeholder={isEn ? 'Your company name' : 'Nom de votre entreprise'}
            />
          </div>
        </div>

        {/* Phone Field */}
        <div className="space-y-1.5">
          <label 
            htmlFor="contact-phone-app" 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: fieldFocus.phone ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Phone' : 'Téléphone'} <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>({isEn ? 'optional' : 'optionnel'})</span>
          </label>
          <div className="relative">
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{ color: fieldFocus.phone ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
            >
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="contact-phone-app"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onFocus={() => handleFocus('phone')}
              onBlur={() => handleBlur('phone')}
              maxLength={20}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none"
              style={getInputStyle('phone', !!formData.phone)}
              placeholder={isEn ? '(555) 123-4567' : '(555) 123-4567'}
            />
          </div>
        </div>
      </div>

      {/* Industry Field */}
      <div className="space-y-1.5">
        <label 
          htmlFor="contact-industry-app" 
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: fieldFocus.industry ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? 'Industry' : 'Industrie'} <span style={{ color: 'rgb(var(--color-primary-500))' }}>*</span>
        </label>
        <div className="relative">
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
            style={{ color: fieldFocus.industry ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
          >
            <Briefcase className="w-4 h-4" />
          </div>
          <select
            id="contact-industry-app"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            onFocus={() => handleFocus('industry')}
            onBlur={() => handleBlur('industry')}
            required
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none appearance-none cursor-pointer"
            style={getInputStyle('industry', !!formData.industry)}
          >
            {industries.map(i => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
          <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Subject Field */}
      <div className="space-y-1.5">
        <label 
          htmlFor="contact-subject-app" 
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: fieldFocus.subject ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? 'Subject' : 'Sujet'} <span style={{ color: 'rgb(var(--color-primary-500))' }}>*</span>
        </label>
        <div className="relative">
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
            style={{ color: fieldFocus.subject ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
          >
            <Tag className="w-4 h-4" />
          </div>
          <select
            id="contact-subject-app"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            onFocus={() => handleFocus('subject')}
            onBlur={() => handleBlur('subject')}
            required
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none appearance-none cursor-pointer"
            style={getInputStyle('subject', !!formData.subject)}
          >
            {subjects.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Message Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label 
            htmlFor="contact-message-app" 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: fieldFocus.message ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Message' : 'Message'} <span style={{ color: 'rgb(var(--color-primary-500))' }}>*</span>
          </label>
          <span 
            className="text-xs transition-colors"
            style={{ 
              color: isNearLimit 
                ? messageLength >= maxMessageLength 
                  ? 'rgb(var(--color-error))' 
                  : 'rgb(var(--color-warning))'
                : 'rgb(var(--color-text-muted))'
            }}
          >
            {messageLength.toLocaleString()} / {maxMessageLength.toLocaleString()}
          </span>
        </div>
        <div className="relative">
          <div 
            className="absolute left-3 top-3 pointer-events-none transition-colors"
            style={{ color: fieldFocus.message ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <textarea
            ref={messageRef}
            id="contact-message-app"
            name="message"
            value={formData.message}
            onChange={handleChange}
            onFocus={() => handleFocus('message')}
            onBlur={() => handleBlur('message')}
            required
            minLength={10}
            maxLength={maxMessageLength}
            rows={5}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none resize-none"
            style={getInputStyle('message', !!formData.message)}
            placeholder={isEn ? 'How can we help you?' : 'Comment pouvons-nous vous aider?'}
          />
        </div>
      </div>

      {/* How did you hear about us */}
      <div className="space-y-1.5">
        <label 
          htmlFor="contact-referral-app" 
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: fieldFocus.referralSource ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? 'How did you hear about us?' : 'Comment avez-vous entendu parler de nous?'} <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>({isEn ? 'optional' : 'optionnel'})</span>
        </label>
        <div className="relative">
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
            style={{ color: fieldFocus.referralSource ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}
          >
            <HelpCircle className="w-4 h-4" />
          </div>
          <select
            id="contact-referral-app"
            name="referralSource"
            value={formData.referralSource}
            onChange={handleChange}
            onFocus={() => handleFocus('referralSource')}
            onBlur={() => handleBlur('referralSource')}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none appearance-none cursor-pointer"
            style={getInputStyle('referralSource', !!formData.referralSource)}
          >
            {referralSources.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Status Messages & Submit Button */}
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ 
              backgroundColor: 'rgb(var(--color-success) / 0.08)',
              borderColor: 'rgb(var(--color-success) / 0.2)',
            }}
          >
            <div 
              className="p-1.5 rounded-full"
              style={{ backgroundColor: 'rgb(var(--color-success) / 0.15)' }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                {isEn ? 'Message sent!' : 'Message envoyé!'}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'We\'ll get back to you within 24 hours.' 
                  : 'Nous vous répondrons dans les 24 heures.'}
              </p>
            </div>
          </motion.div>
        ) : status === 'error' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ 
              backgroundColor: 'rgb(var(--color-error) / 0.08)',
              borderColor: 'rgb(var(--color-error) / 0.2)',
            }}
          >
            <div 
              className="p-1.5 rounded-full"
              style={{ backgroundColor: 'rgb(var(--color-error) / 0.15)' }}
            >
              <AlertCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'rgb(var(--color-error))' }}>
                {isEn ? 'Something went wrong' : 'Une erreur s\'est produite'}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {errorMessage}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            type="submit"
            disabled={status === 'submitting'}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.35)',
            }}
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEn ? 'Sending...' : 'Envoi en cours...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {isEn ? 'Send Message' : 'Envoyer le message'}
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}

export default ContactForm;
