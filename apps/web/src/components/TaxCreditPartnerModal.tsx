/**
 * Tax Credit Partner Referral Modal
 *
 * Modal for requesting consultation with tax credit specialist partners.
 */
import { useState } from 'react';
import { X, Mail, Phone, Building2, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { TaxCredit } from '../lib/taxCredits';
import { taxCreditsApi } from '../lib/api';

interface TaxCreditPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxCredit: TaxCredit;
  organizationId: string;
}

export default function TaxCreditPartnerModal({
  isOpen,
  onClose,
  taxCredit,
  organizationId,
}: TaxCreditPartnerModalProps) {
  const { t, language } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await taxCreditsApi.requestConsultation({
        organizationId,
        taxCreditId: taxCredit.id,
        contactInfo: formData,
      });

      if (response) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          // Reset form
          setFormData({
            name: '',
            email: '',
            phone: '',
            companyName: '',
            notes: '',
          });
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage('Failed to submit request. Please try again.');
      }
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {language === 'fr' ? 'Demander une consultation' : 'Request Consultation'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {taxCredit.shortName[language]} - {taxCredit.name[language]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitStatus === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {language === 'fr' ? 'Demande envoyée!' : 'Request Submitted!'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'fr'
                  ? 'Un spécialiste en crédits d\'impôt vous contactera sous peu.'
                  : 'A tax credit specialist will contact you shortly.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  {language === 'fr'
                    ? 'En soumettant ce formulaire, vous acceptez d\'être contacté par un partenaire certifié spécialisé en crédits d\'impôt. Nous partagerons vos informations de contact uniquement avec des partenaires de confiance.'
                    : 'By submitting this form, you agree to be contacted by a certified tax credit specialist partner. We will only share your contact information with trusted partners.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {language === 'fr' ? 'Nom complet' : 'Full Name'} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={language === 'fr' ? 'Jean Dupont' : 'John Doe'}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {language === 'fr' ? 'Courriel' : 'Email'} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={language === 'fr' ? 'jean@example.com' : 'john@example.com'}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {language === 'fr' ? 'Téléphone' : 'Phone'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={language === 'fr' ? '+1 (555) 123-4567' : '+1 (555) 123-4567'}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {language === 'fr' ? 'Nom de l\'entreprise' : 'Company Name'}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={language === 'fr' ? 'Mon Entreprise Inc.' : 'My Company Inc.'}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {language === 'fr' ? 'Notes supplémentaires' : 'Additional Notes'}
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder={
                        language === 'fr'
                          ? 'Informations supplémentaires sur votre situation...'
                          : 'Additional information about your situation...'
                      }
                    />
                  </div>
                </div>

                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">
                        {language === 'fr' ? 'Erreur' : 'Error'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isSubmitting 
                        ? 'rgb(var(--color-gray-400))' 
                        : 'rgb(var(--color-primary-500))',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500))';
                      }
                    }}
                  >
                    {isSubmitting
                      ? language === 'fr'
                        ? 'Envoi...'
                        : 'Submitting...'
                      : language === 'fr'
                      ? 'Envoyer la demande'
                      : 'Submit Request'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
