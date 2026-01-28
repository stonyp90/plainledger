<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>We received a request to reset your PlainLedger password. Click the button below to set a new password:</p>
    
    <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" class="email-button">Reset Password</a>
    </p>
    
    <div class="email-link-text">
        Or copy and paste this link into your browser:<br>
        <a href="${link}">${link}</a>
    </div>
    
    <div class="email-warning">
        <strong>Security Notice:</strong> This link will expire in 15 minutes for your protection.<br>
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    </div>
    
    <div class="email-note">
        <strong>Tips for a strong password:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 16px;">
            <li>At least 12 characters long</li>
            <li>Mix of uppercase and lowercase letters</li>
            <li>Include numbers and special characters</li>
            <li>Don't reuse passwords from other sites</li>
        </ul>
    </div>
    
    <div class="email-signature">
        <p>Stay secure,<br><strong>The PlainLedger Team</strong></p>
    </div>
</@layout.emailLayout>
