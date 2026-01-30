/**
 * Contact Page
 * 
 * In-app contact form and support options
 */

import { Mail, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import config from '../lib/config';
import ContactForm from '../components/ContactForm';

export default function Contact() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const handleScheduleCall = () => {
    window.open('https://calendly.com/anthonypaquet1508', '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link 
        to="/app/settings"
        className="inline-flex items-center gap-2 text-sm mb-6 transition-colors hover:underline"
        style={{ color: 'rgb(var(--color-primary-500))' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {isEn ? 'Back to Settings' : 'Retour aux paramètres'}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 
          className="text-2xl sm:text-3xl font-bold mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Contact Us' : 'Nous contacter'}
        </h1>
        <p style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Have questions? Need help? We\'re here for you.'
            : 'Des questions? Besoin d\'aide? Nous sommes là pour vous.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Form - Takes 2 columns */}
        <div 
          className="lg:col-span-2 p-6 rounded-2xl border"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Send us a message' : 'Envoyez-nous un message'}
          </h2>
          <ContactForm source="app-contact-page" />
        </div>

        {/* Quick Contact Options - Takes 1 column */}
        <div className="space-y-4">
          {/* Response Time */}
          <div 
            className="p-4 rounded-xl"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
              border: '1px solid rgb(var(--color-primary-500) / 0.2)',
            }}
          >
            <p 
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-primary-600))' }}
            >
              {isEn ? '⚡ Quick Response' : '⚡ Réponse rapide'}
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'We typically respond within 24 hours'
                : 'Nous répondons généralement dans les 24 heures'}
            </p>
          </div>

          {/* Email */}
          <a
            href={`mailto:${config.support.email}`}
            className="w-full p-4 rounded-xl border flex items-center gap-4 transition-all hover:shadow-md"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Mail className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Email' : 'Courriel'}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-primary-500))' }}>
                {config.support.email}
              </p>
            </div>
          </a>

          {/* Schedule Call */}
          <button
            onClick={handleScheduleCall}
            className="w-full p-4 rounded-xl border flex items-center gap-4 transition-all text-left hover:shadow-md"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Calendar className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Schedule a Call' : 'Planifier un appel'}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Book a 15-minute demo' : 'Réservez une démo de 15 min'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
