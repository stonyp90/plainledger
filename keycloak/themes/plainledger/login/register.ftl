<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        ${msg("registerTitle")}
    <#elseif section = "form">
        <div class="redirect-message">
            <p>${msg("redirectingToSignup")}</p>
        </div>
        <script>
            // Redirect to website onboarding flow
            window.location.href = 'https://plainledger.ca/onboarding';
        </script>
        <noscript>
            <div id="kc-registration">
                <p>${msg("redirectManual")}</p>
                <a href="https://plainledger.ca/onboarding" class="pf-c-button pf-m-primary">${msg("doRegister")}</a>
            </div>
        </noscript>
    </#if>
</@layout.registrationLayout>
