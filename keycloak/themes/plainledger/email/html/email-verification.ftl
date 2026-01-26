<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>Welcome to PlainLedger! To complete your registration, please verify your email address by clicking the button below:</p>
    
    <p style="text-align: center;">
        <a href="${link}" class="email-button">Verify Email Address</a>
    </p>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 13px; color: #737373;">${link}</p>
    
    <hr class="email-divider">
    
    <div class="email-note">
        <strong>This link will expire in 24 hours.</strong><br>
        If you didn't create a PlainLedger account, you can safely ignore this email.
    </div>
    
    <p style="margin-top: 24px;">— The PlainLedger Team</p>
</@layout.emailLayout>
