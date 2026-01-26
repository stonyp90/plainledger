/**
 * PlainLedger Crisp Live Chat Integration
 * 
 * Full-featured customer support chat with:
 * - Automatic user identification
 * - Page context awareness
 * - Bilingual support (EN/FR)
 * - Help center integration
 * - Event tracking
 * - Automated messages
 */

import { useEffect, useCallback, createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';
import { useTenant } from '../contexts/TenantContext';
import { useLocation } from 'react-router-dom';

// Extend window type for Crisp
declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
    CRISP_RUNTIME_CONFIG?: {
      lock_maximized?: boolean;
      lock_full_view?: boolean;
      cross_origin_cookies?: boolean;
    };
  }
}

// =====================================================
// CONFIGURATION
// =====================================================

// PlainLedger brand colors for Crisp configuration
export const CRISP_THEME_CONFIG = {
  // Primary color - matches PlainLedger corporate theme
  color: '#1e40af', // Primary blue
  colorDark: '#1e3a8a', // Darker for hover
  // Position
  position: 'right' as const,
  // Default locale (Quebec market = French)
  defaultLocale: 'fr',
};

// Page-specific help topics
const PAGE_HELP_TOPICS: Record<string, { en: string; fr: string; article?: string }> = {
  '/app': {
    en: 'Need help with your dashboard?',
    fr: 'Besoin d\'aide avec votre tableau de bord?',
    article: 'dashboard-overview',
  },
  '/app/dashboard': {
    en: 'Need help understanding your financial metrics?',
    fr: 'Besoin d\'aide pour comprendre vos métriques financières?',
    article: 'financial-metrics',
  },
  '/app/anomalies': {
    en: 'Questions about anomaly detection?',
    fr: 'Questions sur la détection d\'anomalies?',
    article: 'anomaly-detection',
  },
  '/app/connections': {
    en: 'Need help connecting your accounting software?',
    fr: 'Besoin d\'aide pour connecter votre logiciel comptable?',
    article: 'connect-accounting',
  },
  '/app/reports': {
    en: 'Questions about financial reports?',
    fr: 'Questions sur les rapports financiers?',
    article: 'financial-reports',
  },
  '/app/settings': {
    en: 'Need help with settings?',
    fr: 'Besoin d\'aide avec les paramètres?',
    article: 'settings-guide',
  },
  '/store': {
    en: 'Have questions about pricing?',
    fr: 'Des questions sur nos tarifs?',
    article: 'pricing-faq',
  },
};

// Automated welcome messages
const WELCOME_MESSAGES = {
  newUser: {
    en: "👋 Welcome to PlainLedger! I'm here to help you get started. What would you like to know?",
    fr: "👋 Bienvenue chez PlainLedger! Je suis là pour vous aider à démarrer. Que souhaitez-vous savoir?",
  },
  returningUser: {
    en: "👋 Welcome back! How can I assist you today?",
    fr: "👋 Bon retour! Comment puis-je vous aider aujourd'hui?",
  },
  pricing: {
    en: "Looking at our pricing? I can help you choose the right plan for your needs!",
    fr: "Vous consultez nos tarifs? Je peux vous aider à choisir le bon forfait!",
  },
  support: {
    en: "Our Quebec-based support team typically responds within 2 hours during business hours (9am-5pm EST).",
    fr: "Notre équipe de support basée au Québec répond généralement en moins de 2 heures durant les heures d'affaires (9h-17h HE).",
  },
};

// =====================================================
// CRISP CONTEXT
// =====================================================

interface CrispContextValue {
  isLoaded: boolean;
  isOpen: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  show: () => void;
  hide: () => void;
  sendMessage: (message: string) => void;
  showWelcome: (type?: keyof typeof WELCOME_MESSAGES) => void;
  setUser: (email: string, name?: string) => void;
  setSegments: (segments: string[]) => void;
  trackEvent: (event: string, data?: Record<string, unknown>) => void;
  openArticle: (articleId: string) => void;
}

const CrispContext = createContext<CrispContextValue | null>(null);

export function useCrisp() {
  const context = useContext(CrispContext);
  if (!context) {
    // Return a no-op version if Crisp is not enabled
    return {
      isLoaded: false,
      isOpen: false,
      unreadCount: 0,
      open: () => {},
      close: () => {},
      toggle: () => {},
      show: () => {},
      hide: () => {},
      sendMessage: () => {},
      showWelcome: () => {},
      setUser: () => {},
      setSegments: () => {},
      trackEvent: () => {},
      openArticle: () => {},
    };
  }
  return context;
}

// =====================================================
// CRISP PROVIDER
// =====================================================

interface CrispProviderProps {
  websiteId: string;
  children: ReactNode;
}

export function CrispProvider({ websiteId, children }: CrispProviderProps) {
  const { user, authenticated } = useAuth();
  const { language } = useI18n();
  const { currentTenant } = useTenant();
  const location = useLocation();
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const isEn = language === 'en';

  // Initialize Crisp
  useEffect(() => {
    if (!websiteId) return;

    // Initialize Crisp array
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Configure Crisp appearance before loading
    window.$crisp.push(['config', 'color:theme', CRISP_THEME_CONFIG.color]);
    window.$crisp.push(['config', 'position:reverse', CRISP_THEME_CONFIG.position === 'left']);
    window.$crisp.push(['config', 'container:index', 9999]);
    
    // Set locale based on language context
    const locale = isEn ? 'en' : 'fr';
    window.$crisp.push(['config', 'locale', locale]);

    // Enable sound notifications
    window.$crisp.push(['config', 'sound:enable', true]);
    
    // Safe mode for better performance
    window.$crisp.push(['safe', true]);

    // Load Crisp script
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    
    script.onload = () => {
      setIsLoaded(true);
      console.log('[Crisp] Loaded successfully');

      // Set up event listeners
      if (window.$crisp) {
        // Chat opened
        window.$crisp.push(['on', 'chat:opened', () => {
          setIsOpen(true);
          console.log('[Crisp] Chat opened');
        }]);

        // Chat closed
        window.$crisp.push(['on', 'chat:closed', () => {
          setIsOpen(false);
          console.log('[Crisp] Chat closed');
        }]);

        // Message received
        window.$crisp.push(['on', 'message:received', () => {
          setUnreadCount(prev => prev + 1);
        }]);

        // Message read
        window.$crisp.push(['on', 'message:read', () => {
          setUnreadCount(0);
        }]);

        // Session loaded
        window.$crisp.push(['on', 'session:loaded', () => {
          console.log('[Crisp] Session loaded');
        }]);
      }
    };

    script.onerror = () => {
      console.error('[Crisp] Failed to load');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [websiteId, isEn]);

  // Update locale when language changes
  useEffect(() => {
    if (isLoaded && window.$crisp) {
      const locale = isEn ? 'en' : 'fr';
      window.$crisp.push(['config', 'locale', locale]);
    }
  }, [isLoaded, isEn]);

  // Set user data when authenticated
  useEffect(() => {
    if (!isLoaded || !authenticated || !user || !window.$crisp) return;

    const setCrispUser = () => {
      try {
        // Set user email
        if (user.email) {
          window.$crisp.push(['set', 'user:email', [user.email]]);
        }
        
        // Set user nickname
        if (user.name) {
          window.$crisp.push(['set', 'user:nickname', [user.name]]);
        }

        // Set avatar if available
        if (user.avatar) {
          window.$crisp.push(['set', 'user:avatar', [user.avatar]]);
        }

        // Set segments for targeting
        const segments: string[] = [];
        if (user.organization) segments.push(user.organization);
        if (currentTenant?.plan) segments.push(`plan:${currentTenant.plan}`);
        if (user.roles?.includes('admin')) segments.push('admin');
        if (segments.length > 0) {
          window.$crisp.push(['set', 'session:segments', [segments]]);
        }

        // Set custom session data
        window.$crisp.push(['set', 'session:data', [
          ['user_id', user.id || ''],
          ['organization', user.organization || ''],
          ['organization_id', currentTenant?.id || ''],
          ['plan', currentTenant?.plan || 'free'],
          ['roles', user.roles?.join(', ') || ''],
          ['locale', isEn ? 'en-CA' : 'fr-CA'],
          ['timezone', Intl.DateTimeFormat().resolvedOptions().timeZone],
        ]]);

        console.log('[Crisp] User data set:', user.email);
      } catch (error) {
        console.error('[Crisp] Failed to set user data:', error);
      }
    };

    // Set immediately and retry after delay
    setCrispUser();
    const timeout = setTimeout(setCrispUser, 2000);

    return () => clearTimeout(timeout);
  }, [isLoaded, authenticated, user, currentTenant, isEn]);

  // Track page views and show contextual help
  useEffect(() => {
    if (!isLoaded || !window.$crisp) return;

    const pagePath = location.pathname;
    
    // Track page view
    window.$crisp.push(['set', 'session:event', ['page:view', { path: pagePath }]]);

    // Set page context for support team
    window.$crisp.push(['set', 'session:data', [['current_page', pagePath]]]);

    // Show contextual welcome message on first visit (only once per session)
    if (!hasShownWelcome && authenticated) {
      const helpTopic = PAGE_HELP_TOPICS[pagePath];
      if (helpTopic && pagePath === '/store') {
        // Show pricing help after a delay
        setTimeout(() => {
          if (window.$crisp) {
            window.$crisp.push(['do', 'message:show', ['text', isEn ? WELCOME_MESSAGES.pricing.en : WELCOME_MESSAGES.pricing.fr]]);
          }
        }, 5000);
        setHasShownWelcome(true);
      }
    }
  }, [isLoaded, location.pathname, authenticated, hasShownWelcome, isEn]);

  // Context value methods
  const open = useCallback(() => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:open']);
    }
  }, []);

  const close = useCallback(() => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:close']);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const show = useCallback(() => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:show']);
    }
  }, []);

  const hide = useCallback(() => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:hide']);
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'message:send', ['text', message]]);
    }
  }, []);

  const showWelcome = useCallback((type: keyof typeof WELCOME_MESSAGES = 'returningUser') => {
    if (window.$crisp) {
      const message = WELCOME_MESSAGES[type];
      window.$crisp.push(['do', 'message:show', ['text', isEn ? message.en : message.fr]]);
    }
  }, [isEn]);

  const setUser = useCallback((email: string, name?: string) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'user:email', [email]]);
      if (name) {
        window.$crisp.push(['set', 'user:nickname', [name]]);
      }
    }
  }, []);

  const setSegments = useCallback((segments: string[]) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:segments', [segments]]);
    }
  }, []);

  const trackEvent = useCallback((event: string, data?: Record<string, unknown>) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:event', [event, data]]);
    }
  }, []);

  const openArticle = useCallback((articleId: string) => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'helpdesk:search', [articleId]]);
      open();
    }
  }, [open]);

  const value: CrispContextValue = {
    isLoaded,
    isOpen,
    unreadCount,
    open,
    close,
    toggle,
    show,
    hide,
    sendMessage,
    showWelcome,
    setUser,
    setSegments,
    trackEvent,
    openArticle,
  };

  return (
    <CrispContext.Provider value={value}>
      {children}
    </CrispContext.Provider>
  );
}

// =====================================================
// LEGACY COMPONENT (for backwards compatibility)
// =====================================================

interface CrispChatProps {
  websiteId: string;
}

export default function CrispChat({ websiteId }: CrispChatProps) {
  const { user, authenticated } = useAuth();
  const { language } = useI18n();
  const isEn = language === 'en';

  useEffect(() => {
    if (!websiteId) {
      console.log('[Crisp] No website ID provided, skipping initialization');
      return;
    }

    // Initialize Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Configure Crisp appearance before loading
    window.$crisp.push(['config', 'color:theme', CRISP_THEME_CONFIG.color]);
    window.$crisp.push(['config', 'position:reverse', CRISP_THEME_CONFIG.position === 'left']);
    window.$crisp.push(['config', 'container:index', 9999]);
    
    // Set locale based on language
    window.$crisp.push(['config', 'locale', isEn ? 'en' : 'fr']);

    // Enable availability tooltip
    window.$crisp.push(['config', 'availability:tooltip', true]);
    
    // Safe mode
    window.$crisp.push(['safe', true]);

    // Load Crisp script
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    
    script.onload = () => {
      console.log('[Crisp] Script loaded');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [websiteId, isEn]);

  // Set user data when authenticated
  useEffect(() => {
    if (authenticated && user && window.$crisp) {
      const setCrispUser = () => {
        if (typeof window.$crisp.push === 'function') {
          if (user.email) {
            window.$crisp.push(['set', 'user:email', [user.email]]);
          }
          if (user.name) {
            window.$crisp.push(['set', 'user:nickname', [user.name]]);
          }
          if (user.organization) {
            window.$crisp.push(['set', 'session:segments', [[user.organization]]]);
          }
          window.$crisp.push(['set', 'session:data', [
            ['user_id', user.id || ''],
            ['organization', user.organization || ''],
            ['roles', user.roles?.join(', ') || ''],
            ['locale', isEn ? 'en-CA' : 'fr-CA'],
          ]]);
        }
      };

      setCrispUser();
      const timeout = setTimeout(setCrispUser, 2000);
      return () => clearTimeout(timeout);
    }
  }, [authenticated, user, isEn]);

  return null;
}

// =====================================================
// UTILITY FUNCTIONS (for use without context)
// =====================================================

export const crispUtils = {
  // Open the chat box
  open: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:open']);
    }
  },

  // Close the chat box
  close: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:close']);
    }
  },

  // Toggle the chat box
  toggle: () => {
    if (window.$crisp) {
      // Check if chat is currently open
      // Since we can't directly check, we'll just open it
      window.$crisp.push(['do', 'chat:open']);
    }
  },

  // Show the chat box
  show: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:show']);
    }
  },

  // Hide the chat box
  hide: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:hide']);
    }
  },

  // Send a message from the user
  sendMessage: (message: string) => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'message:send', ['text', message]]);
    }
  },

  // Show a message from the operator (bot)
  showMessage: (message: string, type: 'text' | 'picker' = 'text') => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'message:show', [type, message]]);
    }
  },

  // Set user email
  setEmail: (email: string) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'user:email', [email]]);
    }
  },

  // Set user name
  setName: (name: string) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'user:nickname', [name]]);
    }
  },

  // Set custom session data
  setSessionData: (key: string, value: string) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:data', [[key, value]]]);
    }
  },

  // Set segments for targeting
  setSegments: (segments: string[]) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:segments', [segments]]);
    }
  },

  // Trigger an event (for automation)
  triggerEvent: (eventName: string, data?: Record<string, unknown>) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:event', [eventName, data]]);
    }
  },

  // Open helpdesk article
  openArticle: (articleId: string) => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'helpdesk:search', [articleId]]);
      window.$crisp.push(['do', 'chat:open']);
    }
  },

  // Search helpdesk
  searchHelp: (query: string) => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'helpdesk:search', [query]]);
      window.$crisp.push(['do', 'chat:open']);
    }
  },

  // Reset session (logout)
  reset: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'session:reset']);
    }
  },

  // Check if Crisp is loaded
  isLoaded: () => {
    return typeof window !== 'undefined' && Array.isArray(window.$crisp);
  },
};
