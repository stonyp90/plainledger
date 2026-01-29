<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>To keep your PlainLedger account secure, please complete the following steps:</p>
    
    <ul class="action-list">
    <#if requiredActions??>
        <#list requiredActions as reqActionItem>
            <li>${msg("requiredAction.${reqActionItem}")}</li>
        </#list>
    </#if>
    </ul>
    
    <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" class="email-button">Complete Setup</a>
    </p>
    
    <div class="email-link-text">
        Or copy and paste this link into your browser:<br>
        <a href="${link}">${link}</a>
    </div>
    
    <div class="email-note">
        <strong>This link will expire in ${linkExpiration} minutes.</strong><br>
        If you did not create a PlainLedger account, you can safely ignore this email.
    </div>
    
    <div class="email-signature">
        <p>Best regards,<br><strong>The PlainLedger Team</strong></p>
    </div>
</@layout.emailLayout>
