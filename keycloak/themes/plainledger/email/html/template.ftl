<#macro emailLayout>
<!DOCTYPE html>
<html lang="${(locale!'en')?split('_')[0]}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>PlainLedger</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset styles for email clients */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #f8fafc;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        /* PlainLedger Brand Colors */
        .brand-primary { color: #059669; }
        .brand-primary-bg { background-color: #059669; }
        .brand-primary-light { color: #10b981; }
        .brand-accent { color: #d4af37; }
        
        /* Email Container */
        .email-wrapper {
            width: 100%;
            background-color: #f8fafc;
            padding: 40px 16px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        
        /* Header with Logo */
        .email-header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            padding: 20px 32px;
            text-align: center;
        }
        .email-logo {
            display: inline-block;
        }
        .email-logo-icon {
            width: 32px;
            height: 32px;
            margin-bottom: 8px;
        }
        .email-logo-text {
            color: #ffffff;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.02em;
            margin: 0;
            text-decoration: none;
        }
        .email-tagline {
            color: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            margin: 4px 0 0 0;
            font-weight: 400;
        }
        
        /* Body Content */
        .email-body {
            padding: 40px;
            font-size: 16px;
            line-height: 1.7;
            color: #334155;
        }
        .email-body p {
            margin: 0 0 16px 0;
            color: #475569;
        }
        .email-body p:last-child {
            margin-bottom: 0;
        }
        .email-body strong {
            color: #1e293b;
            font-weight: 600;
        }
        
        /* Primary CTA Button - Brand Green */
        .email-button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            margin: 8px 0;
            text-align: center;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3);
        }
        .email-button:hover {
            background: linear-gradient(135deg, #047857 0%, #065f46 100%);
        }
        
        /* Secondary link text */
        .email-link-text {
            word-break: break-all;
            font-size: 13px;
            color: #64748b;
            background: #f1f5f9;
            padding: 12px 16px;
            border-radius: 8px;
            display: block;
            margin: 16px 0;
        }
        .email-link-text a {
            color: #059669;
            text-decoration: none;
        }
        
        /* Divider */
        .email-divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 28px 0;
        }
        
        /* Info/Note Box */
        .email-note {
            font-size: 14px;
            color: #64748b;
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
            border-left: 4px solid #10b981;
            padding: 16px 20px;
            border-radius: 0 8px 8px 0;
            margin: 24px 0;
        }
        .email-note strong {
            color: #059669;
        }
        
        /* Warning Box */
        .email-warning {
            font-size: 14px;
            color: #92400e;
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 16px 20px;
            border-radius: 0 8px 8px 0;
            margin: 24px 0;
        }
        
        /* Lists */
        .email-body ul {
            padding-left: 20px;
            margin: 16px 0;
            color: #475569;
        }
        .email-body li {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        
        /* Action Items List */
        .action-list {
            list-style: none;
            padding: 0;
            margin: 16px 0;
        }
        .action-list li {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 15px;
            color: #334155;
        }
        .action-list li::before {
            content: "→";
            color: #059669;
            font-weight: 600;
            margin-right: 12px;
        }
        
        /* Signature */
        .email-signature {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 15px;
        }
        
        /* Footer */
        .email-footer {
            padding: 32px 40px;
            background: #f8fafc;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer-brand {
            color: #059669;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .footer-links {
            margin: 16px 0;
        }
        .footer-links a {
            color: #64748b;
            text-decoration: none;
            font-size: 13px;
            margin: 0 12px;
        }
        .footer-links a:hover {
            color: #059669;
            text-decoration: underline;
        }
        .footer-divider {
            width: 60px;
            height: 1px;
            background: #cbd5e1;
            margin: 20px auto;
        }
        .footer-legal {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.6;
        }
        .footer-legal p {
            margin: 0 0 8px 0;
        }
        .footer-legal a {
            color: #64748b;
            text-decoration: underline;
        }
        .footer-address {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 16px;
        }
        
        /* Unsubscribe section */
        .unsubscribe {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        .unsubscribe p {
            font-size: 11px;
            color: #94a3b8;
            margin: 0;
        }
        .unsubscribe a {
            color: #64748b;
        }
        
        /* Responsive */
        @media only screen and (max-width: 620px) {
            .email-wrapper {
                padding: 16px 8px;
            }
            .email-header {
                padding: 16px 20px !important;
            }
            .email-body {
                padding: 24px !important;
            }
            .email-footer {
                padding: 24px !important;
            }
            .email-logo-text {
                font-size: 20px !important;
            }
            .footer-links a {
                display: block;
                margin: 8px 0;
            }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="max-width: 600px; width: 100%;">
                    <!-- Header with Logo -->
                    <tr>
                        <td class="email-header">
                            <div class="email-logo">
                                <!-- PlainLedger Logo Icon -->
                                <img src="https://plainledger.ca/logo-white.png" alt="PlainLedger" class="email-logo-icon" width="32" height="32" style="width: 32px; height: 32px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;">
                                <div class="email-logo-text">PlainLedger</div>
                                <p class="email-tagline">No surprises. Just numbers.</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="email-body">
                            <#nested>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="email-footer">
                            <div class="footer-brand">PlainLedger</div>
                            
                            <div class="footer-links">
                                <a href="https://plainledger.ca">Website</a>
                                <a href="https://plainledger.ca/help">Help Center</a>
                                <a href="https://plainledger.ca/privacy">Privacy</a>
                                <a href="https://plainledger.ca/terms">Terms</a>
                            </div>
                            
                            <div class="footer-divider"></div>
                            
                            <div class="footer-legal">
                                <p>&copy; ${.now?string('yyyy')} PlainLedger Inc. All rights reserved.</p>
                                <p>
                                    You are receiving this email because you have an account with PlainLedger or requested information from us. 
                                    This is a transactional email related to your account activity. You cannot unsubscribe from account-related notifications.
                                </p>
                            </div>
                            
                            <div class="footer-address">
                                PlainLedger Inc.<br>
                                Montreal, Quebec, Canada
                            </div>
                            
                            <div class="unsubscribe">
                                <p>
                                    <a href="https://plainledger.ca/settings/notifications">Manage email preferences</a> &bull; 
                                    <a href="https://plainledger.ca/unsubscribe">Unsubscribe from marketing emails</a>
                                </p>
                                <p style="margin-top: 8px;">
                                    If you believe you received this in error, please contact <a href="mailto:support@plainledger.ca">support@plainledger.ca</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
</#macro>
