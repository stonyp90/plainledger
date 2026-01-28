<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>Your administrator has requested that you update your PlainLedger account. Please complete the following actions:</p>
    
    <ul class="action-list">
    <#if requiredActions??>
        <#list requiredActions as reqActionItem>
            <li>${msg("requiredAction.${reqActionItem}")}</li>
        </#list>
    </#if>
    </ul>
    
    <p>Click the button below to complete this process:</p>
    
    <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" class="email-button">Update Account</a>
    </p>
    
    <div class="email-link-text">
        Or copy and paste this link into your browser:<br>
        <a href="${link}">${link}</a>
    </div>
    
    <div class="email-note">
        <strong>This link will expire in ${linkExpiration} minutes.</strong><br>
        If you didn't expect this email, please contact your administrator or our support team.
    </div>
    
    <div class="email-signature">
        <p>Best regards,<br><strong>The PlainLedger Team</strong></p>
    </div>
</@layout.emailLayout>
