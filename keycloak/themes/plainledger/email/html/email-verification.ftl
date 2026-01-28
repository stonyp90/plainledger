<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>Welcome to <strong>PlainLedger</strong>! We're excited to have you on board.</p>
    
    <p>To get started, please verify your email address by clicking the button below:</p>
    
    <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" class="email-button">Verify Email Address</a>
    </p>
    
    <div class="email-link-text">
        Or copy and paste this link into your browser:<br>
        <a href="${link}">${link}</a>
    </div>
    
    <div class="email-note">
        <strong>This link will expire in 24 hours.</strong><br>
        If you didn't create a PlainLedger account, you can safely ignore this email.
    </div>
    
    <div class="email-signature">
        <p>Welcome aboard,<br><strong>The PlainLedger Team</strong></p>
    </div>
</@layout.emailLayout>
