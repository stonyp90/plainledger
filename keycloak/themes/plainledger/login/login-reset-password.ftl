<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
    <#elseif section = "form">
        <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
            <div class="instruction">
                ${msg("emailInstruction")}
            </div>
            <div class="form-group">
                <label for="username" class="pf-c-form__label">
                    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                </label>
                <input type="text" id="username" name="username" class="pf-c-form-control" autofocus value="${(auth.attemptedUsername!'')}"
                       aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"/>
                <#if messagesPerField.existsError('username')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}
                    </span>
                </#if>
            </div>
            <div id="kc-form-buttons">
                <input class="pf-c-button pf-m-primary pf-m-block" type="submit" value="${msg("doSubmit")}"/>
            </div>
            <div id="kc-registration">
                <span><a href="${url.loginUrl}">${msg("backToLogin")}</a></span>
            </div>
        </form>
    <#elseif section = "info" >
        <#if realm.duplicateEmailsAllowed>
            ${msg("emailInstructionUsername")}
        </#if>
    </#if>
</@layout.registrationLayout>
