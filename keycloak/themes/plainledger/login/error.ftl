<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${msg("errorTitle")}
    <#elseif section = "form">
        <div id="kc-error-message">
            <div class="alert alert-error">
                <span class="icon">✕</span>
                <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
            </div>
            <#if skipLink??>
            <#else>
                <#if client?? && client.baseUrl?has_content>
                    <p id="kc-error-back">
                        <a id="backToApplication" href="${client.baseUrl}">&laquo; ${msg("backToApplication")}</a>
                    </p>
                </#if>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
