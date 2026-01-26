<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('totp'); section>
    <#if section = "header">
        ${msg("loginTotpTitle")}
    <#elseif section = "form">
        <form id="kc-otp-login-form" action="${url.loginAction}" method="post">
            <div class="mfa-info">
                <div class="mfa-icon">🔐</div>
                <p>${msg("loginTotpStep1")}</p>
            </div>
            
            <div class="form-group">
                <label for="otp" class="pf-c-form__label">${msg("loginTotpOneTime")}</label>
                <input id="otp" name="otp" autocomplete="off" type="text" class="pf-c-form-control otp-input"
                       autofocus inputmode="numeric" pattern="[0-9]*" maxlength="6"
                       aria-invalid="<#if messagesPerField.existsError('totp')>true</#if>"
                />
                <#if messagesPerField.existsError('totp')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('totp'))?no_esc}
                    </span>
                </#if>
            </div>

            <div id="kc-form-buttons">
                <input class="pf-c-button pf-m-primary pf-m-block" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
