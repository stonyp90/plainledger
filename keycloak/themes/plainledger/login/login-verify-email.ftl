<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true; section>
    <#if section = "header">
        ${msg("emailVerifyTitle")}
    <#elseif section = "form">
        <div class="email-verify-container">
            <div class="email-icon">📧</div>
            <p class="instruction">${msg("emailVerifyInstruction1")}</p>
        </div>
    <#elseif section = "info">
        <p class="instruction">
            ${msg("emailVerifyInstruction2")}
            <br/>
            <a href="${url.loginAction}">${msg("doClickHere")}</a>
            ${msg("emailVerifyInstruction3")}
        </p>
    </#if>
</@layout.registrationLayout>
