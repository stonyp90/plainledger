/**
 * Corporate Email Templates
 * Following PlainLedger brand guidelines
 */

import { TenantMember } from '../contexts/TenantContext';

// Corporate brand colors (RGB values)
const BRAND_COLORS = {
  primary: '#0f172a',      // Corporate navy
  primaryLight: '#1e293b', // Lighter navy
  accent: '#3b82f6',       // Blue accent
  text: '#0f172a',         // Dark text
  textMuted: '#64748b',    // Muted text
  border: '#e2e8f0',       // Border gray
  background: '#f8fafc',   // Light background
  white: '#ffffff',
  success: '#16a34a',
  warning: '#ca8a04',
};

interface InvitationEmailParams {
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  recipientEmail: string;
  role: 'admin' | 'member' | 'viewer';
  inviteUrl: string;
  expiresAt: string;
  sectionAccess?: SectionAccess;
}

interface SectionAccess {
  dashboard: boolean;
  balanceSheet: boolean;
  incomeStatement: boolean;
  cashFlow: boolean;
  anomalies: boolean;
  connections: boolean;
  reports: boolean;
  settings: boolean;
}

const ROLE_LABELS = {
  admin: { en: 'Administrator', fr: 'Administrateur' },
  member: { en: 'Member', fr: 'Membre' },
  viewer: { en: 'Viewer', fr: 'Lecteur' },
};

const SECTION_LABELS: Record<keyof SectionAccess, { en: string; fr: string }> = {
  dashboard: { en: 'Dashboard', fr: 'Tableau de bord' },
  balanceSheet: { en: 'Balance Sheet', fr: 'Bilan' },
  incomeStatement: { en: 'Income Statement', fr: 'Résultats' },
  cashFlow: { en: 'Cash Flow', fr: 'Flux de trésorerie' },
  anomalies: { en: 'Anomaly Detection', fr: 'Détection d\'anomalies' },
  connections: { en: 'Data Connections', fr: 'Connexions de données' },
  reports: { en: 'Reports', fr: 'Rapports' },
  settings: { en: 'Settings', fr: 'Paramètres' },
};

/**
 * Generate corporate invitation email HTML
 */
export function generateInvitationEmail(params: InvitationEmailParams, language: 'en' | 'fr' = 'fr'): string {
  const {
    inviterName,
    organizationName,
    recipientEmail,
    role,
    inviteUrl,
    expiresAt,
    sectionAccess,
  } = params;
  
  const isEn = language === 'en';
  const roleLabel = ROLE_LABELS[role][language];
  const expiryDate = new Date(expiresAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter accessible sections
  const accessibleSections = sectionAccess 
    ? Object.entries(sectionAccess)
        .filter(([, hasAccess]) => hasAccess)
        .map(([key]) => SECTION_LABELS[key as keyof SectionAccess][language])
    : null;

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEn ? 'Invitation to PlainLedger' : 'Invitation à PlainLedger'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BRAND_COLORS.background}; color: ${BRAND_COLORS.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" align="center" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="background-color: ${BRAND_COLORS.primary}; width: 40px; height: 40px; border-radius: 6px; text-align: center; vertical-align: middle;">
                    <span style="color: ${BRAND_COLORS.white}; font-size: 16px; font-weight: 700;">PL</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.primary}; letter-spacing: -0.025em;">PlainLedger</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.white}; border-radius: 8px; border: 1px solid ${BRAND_COLORS.border};">
                <tr>
                  <td style="padding: 32px;">
                    
                    <!-- Welcome Message -->
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${BRAND_COLORS.primary}; letter-spacing: -0.025em;">
                      ${isEn ? 'You\'re Invited!' : 'Vous êtes invité !'}
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; line-height: 1.6;">
                      ${isEn 
                        ? `<strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on PlainLedger.`
                        : `<strong>${inviterName}</strong> vous invite à rejoindre <strong>${organizationName}</strong> sur PlainLedger.`}
                    </p>
                    
                    <!-- Role Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <tr>
                        <td style="background-color: ${BRAND_COLORS.background}; border: 1px solid ${BRAND_COLORS.border}; border-radius: 6px; padding: 16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: top;">
                                <span style="display: inline-block; width: 36px; height: 36px; background-color: ${BRAND_COLORS.primary}; border-radius: 6px; text-align: center; line-height: 36px; color: ${BRAND_COLORS.white}; font-size: 14px;">
                                  ${role === 'admin' ? '🛡️' : role === 'member' ? '👤' : '👁️'}
                                </span>
                              </td>
                              <td>
                                <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: ${BRAND_COLORS.textMuted};">
                                  ${isEn ? 'Your Role' : 'Votre rôle'}
                                </p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.primary};">
                                  ${roleLabel}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    ${accessibleSections && accessibleSections.length > 0 ? `
                    <!-- Section Access -->
                    <div style="margin-bottom: 24px;">
                      <p style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: ${BRAND_COLORS.textMuted};">
                        ${isEn ? 'You will have access to' : 'Vous aurez accès à'}
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                        ${accessibleSections.map(section => `
                        <tr>
                          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.text};">
                            <span style="color: ${BRAND_COLORS.success}; margin-right: 8px;">✓</span>
                            ${section}
                          </td>
                        </tr>
                        `).join('')}
                      </table>
                    </div>
                    ` : ''}
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 24px;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${inviteUrl}" 
                             style="display: inline-block; background-color: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.white}; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; letter-spacing: -0.006em;">
                            ${isEn ? 'Accept Invitation' : 'Accepter l\'invitation'}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Expiry Notice -->
                    <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textMuted}; text-align: center;">
                      ${isEn 
                        ? `This invitation expires on <strong>${expiryDate}</strong>`
                        : `Cette invitation expire le <strong>${expiryDate}</strong>`}
                    </p>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Help Text -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND_COLORS.textMuted};">
                ${isEn 
                  ? 'If you didn\'t expect this invitation, you can safely ignore this email.'
                  : 'Si vous n\'attendiez pas cette invitation, vous pouvez ignorer ce courriel.'}
              </p>
              <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textMuted};">
                ${isEn 
                  ? 'Having trouble? Contact us at '
                  : 'Des problèmes ? Contactez-nous à '}
                <a href="mailto:support@plainledger.com" style="color: ${BRAND_COLORS.accent};">support@plainledger.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; text-align: center; border-top: 1px solid ${BRAND_COLORS.border}; margin-top: 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="padding-top: 24px;">
                <tr>
                  <td style="background-color: ${BRAND_COLORS.primary}; width: 24px; height: 24px; border-radius: 4px; text-align: center; vertical-align: middle;">
                    <span style="color: ${BRAND_COLORS.white}; font-size: 10px; font-weight: 700;">PL</span>
                  </td>
                  <td style="padding-left: 8px;">
                    <span style="font-size: 12px; font-weight: 500; color: ${BRAND_COLORS.textMuted};">PlainLedger</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: ${BRAND_COLORS.textMuted};">
                © ${new Date().getFullYear()} PlainLedger Inc. ${isEn ? 'All rights reserved.' : 'Tous droits réservés.'}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: ${BRAND_COLORS.textMuted};">
                ${isEn ? 'Enterprise Financial Reporting Platform' : 'Plateforme de rapports financiers d\'entreprise'}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of invitation email
 */
export function generateInvitationEmailText(params: InvitationEmailParams, language: 'en' | 'fr' = 'fr'): string {
  const {
    inviterName,
    organizationName,
    role,
    inviteUrl,
    expiresAt,
    sectionAccess,
  } = params;
  
  const isEn = language === 'en';
  const roleLabel = ROLE_LABELS[role][language];
  const expiryDate = new Date(expiresAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const accessibleSections = sectionAccess 
    ? Object.entries(sectionAccess)
        .filter(([, hasAccess]) => hasAccess)
        .map(([key]) => SECTION_LABELS[key as keyof SectionAccess][language])
    : null;

  if (isEn) {
    return `
PlainLedger - Invitation

You're Invited!

${inviterName} has invited you to join ${organizationName} on PlainLedger.

Your Role: ${roleLabel}

${accessibleSections ? `You will have access to:
${accessibleSections.map(s => `• ${s}`).join('\n')}

` : ''}Accept your invitation by visiting:
${inviteUrl}

This invitation expires on ${expiryDate}.

---

If you didn't expect this invitation, you can safely ignore this email.

Questions? Contact us at support@plainledger.com

© ${new Date().getFullYear()} PlainLedger Inc. All rights reserved.
    `.trim();
  }

  return `
PlainLedger - Invitation

Vous êtes invité !

${inviterName} vous invite à rejoindre ${organizationName} sur PlainLedger.

Votre rôle : ${roleLabel}

${accessibleSections ? `Vous aurez accès à :
${accessibleSections.map(s => `• ${s}`).join('\n')}

` : ''}Acceptez votre invitation en visitant :
${inviteUrl}

Cette invitation expire le ${expiryDate}.

---

Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce courriel.

Des questions ? Contactez-nous à support@plainledger.com

© ${new Date().getFullYear()} PlainLedger Inc. Tous droits réservés.
  `.trim();
}

/**
 * Generate welcome email after user accepts invitation
 */
export function generateWelcomeEmail(
  userName: string,
  organizationName: string,
  role: 'admin' | 'member' | 'viewer',
  loginUrl: string,
  language: 'en' | 'fr' = 'fr'
): string {
  const isEn = language === 'en';
  const roleLabel = ROLE_LABELS[role][language];

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEn ? 'Welcome to PlainLedger' : 'Bienvenue sur PlainLedger'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BRAND_COLORS.background}; color: ${BRAND_COLORS.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" align="center" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="background-color: ${BRAND_COLORS.primary}; width: 40px; height: 40px; border-radius: 6px; text-align: center; vertical-align: middle;">
                    <span style="color: ${BRAND_COLORS.white}; font-size: 16px; font-weight: 700;">PL</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.primary}; letter-spacing: -0.025em;">PlainLedger</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.white}; border-radius: 8px; border: 1px solid ${BRAND_COLORS.border};">
                <tr>
                  <td style="padding: 32px;">
                    
                    <!-- Welcome Message -->
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${BRAND_COLORS.primary}; letter-spacing: -0.025em;">
                      ${isEn ? `Welcome, ${userName}!` : `Bienvenue, ${userName} !`}
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; line-height: 1.6;">
                      ${isEn 
                        ? `You're now part of <strong>${organizationName}</strong> as ${roleLabel}.`
                        : `Vous faites maintenant partie de <strong>${organizationName}</strong> en tant que ${roleLabel}.`}
                    </p>
                    
                    <!-- Quick Start -->
                    <div style="margin-bottom: 24px;">
                      <p style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: ${BRAND_COLORS.textMuted};">
                        ${isEn ? 'Quick Start' : 'Démarrage rapide'}
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.text};">
                            <span style="margin-right: 8px;">1.</span>
                            ${isEn ? 'Sign in to access your dashboard' : 'Connectez-vous pour accéder au tableau de bord'}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.text};">
                            <span style="margin-right: 8px;">2.</span>
                            ${isEn ? 'Explore financial reports and anomalies' : 'Explorez les rapports financiers et anomalies'}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.text};">
                            <span style="margin-right: 8px;">3.</span>
                            ${isEn ? 'Configure your notification preferences' : 'Configurez vos préférences de notification'}
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${loginUrl}" 
                             style="display: inline-block; background-color: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.white}; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; letter-spacing: -0.006em;">
                            ${isEn ? 'Go to Dashboard' : 'Accéder au tableau de bord'}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: ${BRAND_COLORS.textMuted};">
                © ${new Date().getFullYear()} PlainLedger Inc. ${isEn ? 'All rights reserved.' : 'Tous droits réservés.'}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export type { InvitationEmailParams, SectionAccess };
