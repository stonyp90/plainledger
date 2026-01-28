<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm') displayRequiredFields=true; section>
    <#if section = "header">
        ${msg("registerTitle")}
    <#elseif section = "form">
        <form id="kc-register-form" class="form" action="${url.registrationAction}" method="post">
            <div class="form-group">
                <label for="firstName" class="pf-c-form__label">
                    ${msg("firstName")} <span class="required">*</span>
                </label>
                <input type="text" id="firstName" class="pf-c-form-control" name="firstName"
                       value="${(register.formData.firstName!'')}"
                       aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>"
                       autofocus
                />
                <#if messagesPerField.existsError('firstName')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('firstName'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-group">
                <label for="lastName" class="pf-c-form__label">
                    ${msg("lastName")} <span class="required">*</span>
                </label>
                <input type="text" id="lastName" class="pf-c-form-control" name="lastName"
                       value="${(register.formData.lastName!'')}"
                       aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>"
                />
                <#if messagesPerField.existsError('lastName')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('lastName'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-group">
                <label for="email" class="pf-c-form__label">
                    ${msg("email")} <span class="required">*</span>
                </label>
                <input type="email" id="email" class="pf-c-form-control" name="email"
                       value="${(register.formData.email!'')}" autocomplete="email"
                       aria-invalid="<#if messagesPerField.existsError('email')>true</#if>"
                />
                <#if messagesPerField.existsError('email')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('email'))?no_esc}
                    </span>
                </#if>
            </div>

            <#if !realm.registrationEmailAsUsername>
                <div class="form-group">
                    <label for="username" class="pf-c-form__label">
                        ${msg("username")} <span class="required">*</span>
                    </label>
                    <input type="text" id="username" class="pf-c-form-control" name="username"
                           value="${(register.formData.username!'')}" autocomplete="username"
                           aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
                    />
                    <#if messagesPerField.existsError('username')>
                        <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('username'))?no_esc}
                        </span>
                    </#if>
                </div>
            </#if>

            <#if passwordRequired??>
                <div class="form-group">
                    <label for="password" class="pf-c-form__label">
                        ${msg("password")} <span class="required">*</span>
                    </label>
                    <input type="password" id="password" class="pf-c-form-control" name="password"
                           autocomplete="new-password"
                           aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                    />
                    <#if messagesPerField.existsError('password')>
                        <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="password-confirm" class="pf-c-form__label">
                        ${msg("passwordConfirm")} <span class="required">*</span>
                    </label>
                    <input type="password" id="password-confirm" class="pf-c-form-control"
                           name="password-confirm"
                           aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                    />
                    <#if messagesPerField.existsError('password-confirm')>
                        <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                        </span>
                    </#if>
                </div>
            </#if>

            <#if recaptchaRequired??>
                <div class="form-group">
                    <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                </div>
            </#if>

            <div id="kc-form-buttons">
                <input class="pf-c-button pf-m-primary pf-m-block" type="submit" value="${msg("doRegister")}"/>
            </div>
        </form>
    <#elseif section = "info">
        <div id="kc-registration">
            <span>${msg("alreadyHaveAccount")} <a href="${url.loginUrl}">${msg("backToLogin")}</a></span>
        </div>
    </#if>
</@layout.registrationLayout>
