<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm') displayRequiredFields=false; section>
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">
            <input type="text" id="username" name="username" value="${username}" autocomplete="username"
                   readonly="readonly" style="display:none;"/>
            <input type="password" id="password-hidden" name="password-hidden" autocomplete="current-password" style="display:none;"/>

            <div class="password-requirements">
                <p class="requirements-title">${msg("passwordRequirements")}</p>
                <ul class="requirements-list">
                    <li id="req-length"><span class="check-icon">○</span> ${msg("passwordReqLength")}</li>
                    <li id="req-upper"><span class="check-icon">○</span> ${msg("passwordReqUpper")}</li>
                    <li id="req-lower"><span class="check-icon">○</span> ${msg("passwordReqLower")}</li>
                    <li id="req-digit"><span class="check-icon">○</span> ${msg("passwordReqDigit")}</li>
                    <li id="req-special"><span class="check-icon">○</span> ${msg("passwordReqSpecial")}</li>
                </ul>
            </div>

            <div class="form-group">
                <label for="password-new" class="pf-c-form__label">${msg("passwordNew")}</label>
                <input type="password" id="password-new" name="password-new" class="pf-c-form-control"
                       autofocus autocomplete="new-password"
                       aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                       onkeyup="checkPasswordRequirements(this.value)"
                />
                <#if messagesPerField.existsError('password')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('password'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-group">
                <label for="password-confirm" class="pf-c-form__label">${msg("passwordConfirm")}</label>
                <input type="password" id="password-confirm" name="password-confirm" class="pf-c-form-control"
                       autocomplete="new-password"
                       aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                />
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-group">
                <div id="kc-form-options">
                    <#if isAppInitiatedAction??>
                        <div class="checkbox">
                            <label><input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked> ${msg("logoutOtherSessions")}</label>
                        </div>
                    </#if>
                </div>

                <div id="kc-form-buttons">
                    <#if isAppInitiatedAction??>
                        <input class="pf-c-button pf-m-primary pf-m-block" type="submit" value="${msg("doSubmit")}" />
                        <button class="pf-c-button pf-m-secondary pf-m-block" type="submit" name="cancel-aia" value="true">${msg("doCancel")}</button>
                    <#else>
                        <input class="pf-c-button pf-m-primary pf-m-block" type="submit" value="${msg("doSubmit")}" />
                    </#if>
                </div>
            </div>
        </form>
        
        <script>
            function checkPasswordRequirements(password) {
                // Length check (12+ chars)
                updateRequirement('req-length', password.length >= 12);
                // Uppercase check
                updateRequirement('req-upper', /[A-Z]/.test(password));
                // Lowercase check
                updateRequirement('req-lower', /[a-z]/.test(password));
                // Digit check
                updateRequirement('req-digit', /[0-9]/.test(password));
                // Special character check
                updateRequirement('req-special', /[!@#$%^&*(),.?":{}|<>]/.test(password));
            }
            
            function updateRequirement(id, met) {
                var element = document.getElementById(id);
                var icon = element.querySelector('.check-icon');
                if (met) {
                    element.classList.add('met');
                    element.classList.remove('unmet');
                    icon.textContent = '✓';
                } else {
                    element.classList.remove('met');
                    element.classList.add('unmet');
                    icon.textContent = '○';
                }
            }
        </script>
    </#if>
</@layout.registrationLayout>
