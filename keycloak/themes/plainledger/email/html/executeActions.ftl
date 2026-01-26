<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hi${(user.firstName)???then(' ' + user.firstName, '')},</p>
    
    <p>Your administrator has requested that you update your PlainLedger account. Please complete the following actions:</p>
    
    <ul>
    <#if requiredActions??>
        <#list requiredActions as reqActionItem>
            <li>${msg("requiredAction.${reqActionItem}")}</li>
        </#list>
    </#if>
    </ul>
    
    <p>Click the button below to complete this process:</p>
    
    <p style="text-align: center;">
        <a href="${link}" class="email-button">Update Account</a>
    </p>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 13px; color: #737373;">${link}</p>
    
    <hr class="email-divider">
    
    <div class="email-note">
        <strong>This link will expire in ${linkExpiration} minutes.</strong><br>
        If you didn't expect this email, please contact support.
    </div>
    
    <p style="margin-top: 24px;">— The PlainLedger Team</p>
</@layout.emailLayout>
