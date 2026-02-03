/**
 * ContactForm Component
 * 
 * Reusable contact form that submits to the API.
 * Used in both the Landing page (website) and HelpCenter (app).
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, CheckCircle, AlertCircle, Loader2, User, Mail, Tag, MessageSquare, 
  Building2, Phone, Briefcase, HelpCircle, ChevronDown, Check,
  // Industry icons
  Calculator, HardHat, Heart, Factory, Users, Home, ShoppingCart, UtensilsCrossed, 
  Laptop, Truck, HandHeart, MoreHorizontal,
  // Subject icons
  MessageCircle, Play, Headphones, CreditCard, Handshake, ThumbsUp,
  // Referral icons
  Search, Linkedin, Users2, UserCheck, Share2, Calendar
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import config from '../lib/config';

// Custom Dropdown Component with Icons
interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  icon?: React.ReactNode;
  hasError?: boolean;
  isValid?: boolean;
  theme?: {
    green: string;
    greenDark: string;
    greenLight: string;
  };
  id?: string;
  required?: boolean;
}

function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  onBlur,
  placeholder,
  icon,
  hasError,
  isValid,
  theme,
  id,
  required
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const selectableOptions = options.filter(opt => opt.value !== '');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < selectableOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onChange(selectableOptions[highlightedIndex].value);
          setIsOpen(false);
          onBlur?.();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        onBlur?.();
        break;
    }
  };

  const getBorderColor = () => {
    if (hasError) return '#ef4444';
    if (isValid && value) return theme?.green || 'rgb(var(--color-primary-500))';
    return 'rgb(var(--color-border))';
  };

  const getBoxShadow = () => {
    if (isOpen) return `0 0 0 3px ${theme?.green || 'rgb(var(--color-primary-500))'}20`;
    if (isValid && value) return `0 0 0 3px ${theme?.green || 'rgb(var(--color-primary-500))'}15`;
    return 'none';
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full py-3 pr-10 rounded-xl border-2 transition-all duration-200 focus:outline-none text-left flex items-center gap-3 cursor-pointer"
        style={{
          backgroundColor: 'rgb(var(--color-background))',
          borderColor: getBorderColor(),
          color: 'rgb(var(--color-text))',
          paddingLeft: '0.875rem',
          boxShadow: getBoxShadow(),
        }}
      >
        {/* Left icon */}
        <span 
          className="flex-shrink-0"
          style={{ color: value ? (theme?.green || 'rgb(var(--color-primary-500))') : 'rgb(var(--color-text-muted))' }}
        >
          {icon}
        </span>
        
        {/* Selected value or placeholder */}
        <span className="flex-1 flex items-center gap-2.5 truncate">
          {selectedOption?.value ? (
            <>
              <span 
                className="flex-shrink-0"
                style={{ color: theme?.green || 'rgb(var(--color-primary-500))' }}
              >
                {selectedOption.icon}
              </span>
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{placeholder}</span>
          )}
        </span>

        {/* Chevron */}
        <span 
          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform duration-200"
          style={{ 
            color: 'rgb(var(--color-text-muted))',
            transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          }}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      {/* Dropdown list */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listRef}
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-2 py-2 rounded-xl border-2 shadow-xl max-h-64 overflow-auto"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: theme?.green ? `${theme.green}30` : 'rgb(var(--color-border))',
              boxShadow: `0 12px 40px ${theme?.green || 'rgb(var(--color-primary-500))'}15`,
            }}
          >
            {selectableOptions.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  onBlur?.();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className="px-3 py-2.5 cursor-pointer flex items-center gap-3 mx-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: highlightedIndex === index 
                    ? `${theme?.green || 'rgb(var(--color-primary-500))'}10`
                    : option.value === value 
                      ? `${theme?.green || 'rgb(var(--color-primary-500))'}08`
                      : 'transparent',
                }}
              >
                {/* Option icon */}
                <span 
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  style={{ 
                    color: option.value === value 
                      ? (theme?.green || 'rgb(var(--color-primary-500))') 
                      : 'rgb(var(--color-text-muted))' 
                  }}
                >
                  {option.icon}
                </span>
                
                {/* Option label */}
                <span 
                  className="flex-1"
                  style={{ 
                    color: option.value === value 
                      ? (theme?.green || 'rgb(var(--color-primary-500))') 
                      : 'rgb(var(--color-text))' 
                  }}
                >
                  {option.label}
                </span>

                {/* Checkmark for selected */}
                {option.value === value && (
                  <Check 
                    className="w-4 h-4 flex-shrink-0" 
                    style={{ color: theme?.green || 'rgb(var(--color-primary-500))' }}
                  />
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      const response = await fetch(`${config.api.baseUrl}/api/contact`, {
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

  const subjects: DropdownOption[] = [
    { value: '', label: isEn ? 'Select a subject' : 'Sélectionnez un sujet' },
    { value: 'general', label: isEn ? 'General Inquiry' : 'Demande générale', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'demo', label: isEn ? 'Request a Demo' : 'Demander une démo', icon: <Play className="w-4 h-4" /> },
    { value: 'support', label: isEn ? 'Technical Support' : 'Support technique', icon: <Headphones className="w-4 h-4" /> },
    { value: 'billing', label: isEn ? 'Billing Question' : 'Question de facturation', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'partnership', label: isEn ? 'Partnership Opportunity' : 'Opportunité de partenariat', icon: <Handshake className="w-4 h-4" /> },
    { value: 'feedback', label: isEn ? 'Feedback' : 'Commentaires', icon: <ThumbsUp className="w-4 h-4" /> },
  ];

  const industries: DropdownOption[] = [
    { value: '', label: isEn ? 'Select your industry' : 'Sélectionnez votre industrie' },
    { value: 'accounting', label: isEn ? 'Accounting / CPA Firm' : 'Comptabilité / Cabinet CPA', icon: <Calculator className="w-4 h-4" /> },
    { value: 'construction', label: isEn ? 'Construction' : 'Construction', icon: <HardHat className="w-4 h-4" /> },
    { value: 'healthcare', label: isEn ? 'Healthcare' : 'Santé', icon: <Heart className="w-4 h-4" /> },
    { value: 'manufacturing', label: isEn ? 'Manufacturing' : 'Fabrication', icon: <Factory className="w-4 h-4" /> },
    { value: 'professional-services', label: isEn ? 'Professional Services' : 'Services professionnels', icon: <Users className="w-4 h-4" /> },
    { value: 'real-estate', label: isEn ? 'Real Estate' : 'Immobilier', icon: <Home className="w-4 h-4" /> },
    { value: 'retail', label: isEn ? 'Retail / E-commerce' : 'Commerce de détail', icon: <ShoppingCart className="w-4 h-4" /> },
    { value: 'restaurant', label: isEn ? 'Restaurant / Hospitality' : 'Restauration / Hôtellerie', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { value: 'technology', label: isEn ? 'Technology / SaaS' : 'Technologie / SaaS', icon: <Laptop className="w-4 h-4" /> },
    { value: 'transportation', label: isEn ? 'Transportation / Logistics' : 'Transport / Logistique', icon: <Truck className="w-4 h-4" /> },
    { value: 'nonprofit', label: isEn ? 'Non-profit' : 'Organisme à but non lucratif', icon: <HandHeart className="w-4 h-4" /> },
    { value: 'other', label: isEn ? 'Other' : 'Autre', icon: <MoreHorizontal className="w-4 h-4" /> },
  ];

  const referralSources: DropdownOption[] = [
    { value: '', label: isEn ? 'Select an option' : 'Sélectionnez une option' },
    { value: 'google', label: isEn ? 'Google Search' : 'Recherche Google', icon: <Search className="w-4 h-4" /> },
    { value: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> },
    { value: 'referral', label: isEn ? 'Referral / Word of mouth' : 'Référence / Bouche à oreille', icon: <Users2 className="w-4 h-4" /> },
    { value: 'accountant', label: isEn ? 'My Accountant / CPA' : 'Mon comptable / CPA', icon: <UserCheck className="w-4 h-4" /> },
    { value: 'social', label: isEn ? 'Social Media' : 'Médias sociaux', icon: <Share2 className="w-4 h-4" /> },
    { value: 'event', label: isEn ? 'Conference / Event' : 'Conférence / Événement', icon: <Calendar className="w-4 h-4" /> },
    { value: 'other', label: isEn ? 'Other' : 'Autre', icon: <MoreHorizontal className="w-4 h-4" /> },
  ];

  // Form validation state
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormData, boolean>>>({});

  const validateField = (name: keyof ContactFormData, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return isEn ? 'Name is required' : 'Le nom est requis';
        if (value.length < 2) return isEn ? 'Name must be at least 2 characters' : 'Le nom doit avoir au moins 2 caractères';
        return '';
      case 'email':
        if (!value.trim()) return isEn ? 'Email is required' : 'Le courriel est requis';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return isEn ? 'Please enter a valid email' : 'Veuillez entrer un courriel valide';
        return '';
      case 'company':
        if (!value.trim()) return isEn ? 'Company is required' : 'L\'entreprise est requise';
        return '';
      case 'industry':
        if (!value) return isEn ? 'Please select an industry' : 'Veuillez sélectionner une industrie';
        return '';
      case 'subject':
        if (!value) return isEn ? 'Please select a subject' : 'Veuillez sélectionner un sujet';
        return '';
      case 'message':
        if (!value.trim()) return isEn ? 'Message is required' : 'Le message est requis';
        if (value.length < 10) return isEn ? 'Message must be at least 10 characters' : 'Le message doit avoir au moins 10 caractères';
        return '';
      default:
        return '';
    }
  };

  const handleLandingBlur = (name: keyof ContactFormData) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const getFieldStyle = (name: keyof ContactFormData, hasIcon: boolean = true) => {
    const hasError = touched[name] && errors[name];
    const hasValue = !!formData[name];
    return {
      backgroundColor: 'rgb(var(--color-background))',
      borderColor: hasError ? '#ef4444' : hasValue ? theme?.green : 'rgb(var(--color-border))',
      color: 'rgb(var(--color-text))',
      paddingLeft: hasIcon ? '2.75rem' : '1rem',
    };
  };

  // Landing page styles
  if (landingStyle && theme) {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name & Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="contact-name" 
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              <User className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Name' : 'Nom'} <span style={{ color: theme.green }}>*</span>
            </label>
            <div className="relative">
              <div 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: formData.name ? theme.green : 'rgb(var(--color-text-muted))' }}
              >
                <User className="w-4 h-4" />
              </div>
              <input
                id="contact-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleLandingBlur('name')}
                required
                minLength={2}
                maxLength={100}
                className="w-full py-3 pr-4 rounded-xl border-2 transition-all duration-200 focus:outline-none"
                style={{
                  ...getFieldStyle('name'),
                  boxShadow: touched.name && !errors.name && formData.name ? `0 0 0 3px ${theme.green}15` : 'none',
                }}
                placeholder={isEn ? 'Your name' : 'Votre nom'}
              />
              {touched.name && errors.name && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs mt-1.5 flex items-center gap-1"
                  style={{ color: '#ef4444' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </motion.p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="contact-email" 
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              <Mail className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Email' : 'Courriel'} <span style={{ color: theme.green }}>*</span>
            </label>
            <div className="relative">
              <div 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: formData.email ? theme.green : 'rgb(var(--color-text-muted))' }}
              >
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="contact-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleLandingBlur('email')}
                required
                className="w-full py-3 pr-4 rounded-xl border-2 transition-all duration-200 focus:outline-none"
                style={{
                  ...getFieldStyle('email'),
                  boxShadow: touched.email && !errors.email && formData.email ? `0 0 0 3px ${theme.green}15` : 'none',
                }}
                placeholder={isEn ? 'your@email.com' : 'votre@courriel.com'}
              />
              {touched.email && errors.email && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs mt-1.5 flex items-center gap-1"
                  style={{ color: '#ef4444' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </motion.p>
              )}
            </div>
          </div>
        </div>

        {/* Company & Phone Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Company Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="contact-company" 
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              <Building2 className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Company' : 'Entreprise'} <span style={{ color: theme.green }}>*</span>
            </label>
            <div className="relative">
              <div 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: formData.company ? theme.green : 'rgb(var(--color-text-muted))' }}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <input
                id="contact-company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                onBlur={() => handleLandingBlur('company')}
                required
                maxLength={200}
                className="w-full py-3 pr-4 rounded-xl border-2 transition-all duration-200 focus:outline-none"
                style={{
                  ...getFieldStyle('company'),
                  boxShadow: touched.company && !errors.company && formData.company ? `0 0 0 3px ${theme.green}15` : 'none',
                }}
                placeholder={isEn ? 'Your company name' : 'Nom de votre entreprise'}
              />
              {touched.company && errors.company && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs mt-1.5 flex items-center gap-1"
                  style={{ color: '#ef4444' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.company}
                </motion.p>
              )}
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="contact-phone" 
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              <Phone className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Phone' : 'Téléphone'} <span className="text-xs ml-1" style={{ color: 'rgb(var(--color-text-muted))' }}>({isEn ? 'optional' : 'optionnel'})</span>
            </label>
            <div className="relative">
              <div 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: formData.phone ? theme.green : 'rgb(var(--color-text-muted))' }}
              >
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="contact-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={20}
                className="w-full py-3 pr-4 rounded-xl border-2 transition-all duration-200 focus:outline-none"
                style={{
                  ...getFieldStyle('phone'),
                  boxShadow: formData.phone ? `0 0 0 3px ${theme.green}15` : 'none',
                }}
                placeholder={isEn ? '(555) 123-4567' : '(555) 123-4567'}
              />
            </div>
          </div>
        </div>

        {/* Industry & Subject Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Industry Field */}
          <div className="space-y-1.5">
            <label 
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              <Briefcase className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Industry' : 'Industrie'} <span style={{ color: theme.green }}>*</span>
            </label>
            <CustomDropdown
              id="contact-industry"
              options={industries}
              value={formData.industry}
              onChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
              onBlur={() => handleLandingBlur('industry')}
              placeholder={isEn ? 'Select your industry' : 'Sélectionnez votre industrie'}
              icon={<Briefcase className="w-4 h-4" />}
              hasError={!!(touched.industry && errors.industry)}
              isValid={touched.industry && !errors.industry}
              theme={theme}
              required
            />
            {touched.industry && errors.industry && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs flex items-center gap-1"
                style={{ color: '#ef4444' }}
              >
                <AlertCircle className="w-3 h-3" />
                {errors.industry}
              </motion.p>
            )}
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <label 
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              <Tag className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Subject' : 'Sujet'} <span style={{ color: theme.green }}>*</span>
            </label>
            <CustomDropdown
              id="contact-subject"
              options={subjects}
              value={formData.subject}
              onChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              onBlur={() => handleLandingBlur('subject')}
              placeholder={isEn ? 'Select a subject' : 'Sélectionnez un sujet'}
              icon={<Tag className="w-4 h-4" />}
              hasError={!!(touched.subject && errors.subject)}
              isValid={touched.subject && !errors.subject}
              theme={theme}
              required
            />
            {touched.subject && errors.subject && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs flex items-center gap-1"
                style={{ color: '#ef4444' }}
              >
                <AlertCircle className="w-3 h-3" />
                {errors.subject}
              </motion.p>
            )}
          </div>
        </div>
        
        {/* Message */}
        <div className="space-y-1.5">
          <label 
            htmlFor="contact-message" 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            <MessageSquare className="w-3.5 h-3.5" style={{ color: theme.green }} />
            {isEn ? 'Message' : 'Message'} <span style={{ color: theme.green }}>*</span>
          </label>
          <div className="relative">
            <div 
              className="absolute left-3.5 top-3.5 pointer-events-none"
              style={{ color: formData.message ? theme.green : 'rgb(var(--color-text-muted))' }}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <textarea
              id="contact-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              onBlur={() => handleLandingBlur('message')}
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              className="w-full py-3 pr-4 rounded-xl border-2 transition-all duration-200 focus:outline-none resize-none"
              style={{
                ...getFieldStyle('message'),
                boxShadow: touched.message && !errors.message && formData.message ? `0 0 0 3px ${theme.green}15` : 'none',
              }}
              placeholder={isEn ? 'How can we help you?' : 'Comment pouvons-nous vous aider?'}
            />
            {touched.message && errors.message && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs mt-1.5 flex items-center gap-1"
                style={{ color: '#ef4444' }}
              >
                <AlertCircle className="w-3 h-3" />
                {errors.message}
              </motion.p>
            )}
          </div>
        </div>

        {/* How did you hear about us */}
        <div className="space-y-1.5">
          <label 
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            <HelpCircle className="w-3.5 h-3.5" style={{ color: theme.green }} />
            {isEn ? 'How did you hear about us?' : 'Comment avez-vous entendu parler de nous?'} <span className="text-xs ml-1" style={{ color: 'rgb(var(--color-text-muted))' }}>({isEn ? 'optional' : 'optionnel'})</span>
          </label>
          <CustomDropdown
            id="contact-referral"
            options={referralSources}
            value={formData.referralSource}
            onChange={(value) => setFormData(prev => ({ ...prev, referralSource: value }))}
            placeholder={isEn ? 'Select an option' : 'Sélectionnez une option'}
            icon={<HelpCircle className="w-4 h-4" />}
            isValid={!!formData.referralSource}
            theme={theme}
          />
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl border"
              style={{ 
                backgroundColor: `${theme.green}10`,
                borderColor: `${theme.green}30`,
              }}
            >
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${theme.green}20` }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: theme.green }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: theme.green }}>
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
              className="flex items-center gap-3 p-4 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            >
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">
                  {isEn ? 'Something went wrong' : 'Une erreur s\'est produite'}
                </p>
                <p className="text-sm text-red-500 dark:text-red-400/80">{errorMessage}</p>
              </div>
            </motion.div>
          ) : (
            <motion.button
              type="submit"
              disabled={status === 'submitting'}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-70 mt-2"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 20px ${theme.green}40`,
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
