<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>We received a request to reset your PlainLedger password. Click the button below to set a new password:</p>
    
    <p style="text-align: center;">
        <a href="${link}" class="email-button">Reset Password</a>
    </p>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 13px; color: #737373;">${link}</p>
    
    <hr class="email-divider">
    
    <div class="email-note">
        <strong>This link will expire in 15 minutes.</strong><br>
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </div>
    
    <p style="margin-top: 24px;">— The PlainLedger Team</p>
</@layout.emailLayout>
