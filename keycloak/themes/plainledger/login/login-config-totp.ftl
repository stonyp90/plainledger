<#import "template.ftl" as layout>
<@layout.registrationLayout displayRequiredFields=false displayMessage=!messagesPerField.existsError('totp','userLabel'); section>
    <#if section = "header">
        ${msg("loginTotpTitle")}
    <#elseif section = "form">
        <ol id="kc-totp-settings" class="mfa-setup-steps">
            <li>
                <p>${msg("loginTotpStep1")}</p>
                <ul id="kc-totp-supported-apps" class="app-list">
                    <#list totp.supportedApplications as app>
                        <li>${app}</li>
                    </#list>
                </ul>
            </li>

            <#if mode?? && mode = "manual">
                <li>
                    <p>${msg("loginTotpManualStep2")}</p>
                    <div class="manual-setup">
                        <p><strong>${msg("loginTotpAccount")}:</strong> ${totp.totpSecretQRCode.account}</p>
                        <p><strong>${msg("loginTotpKey")}:</strong> <code class="totp-secret">${totp.totpSecretEncoded}</code></p>
                        <p><strong>${msg("loginTotpType")}:</strong> ${msg("loginTotp." + totp.policy.type)}</p>
                        <p><strong>${msg("loginTotpAlgorithm")}:</strong> ${totp.policy.getAlgorithmKey()}</p>
                        <p><strong>${msg("loginTotpDigits")}:</strong> ${totp.policy.digits}</p>
                        <#if totp.policy.type = "totp">
                            <p><strong>${msg("loginTotpInterval")}:</strong> ${totp.policy.period}</p>
                        <#elseif totp.policy.type = "hotp">
                            <p><strong>${msg("loginTotpCounter")}:</strong> ${totp.policy.initialCounter}</p>
                        </#if>
                    </div>
                    <p><a href="${totp.qrUrl}" id="mode-barcode">${msg("loginTotpScanBarcode")}</a></p>
                </li>
            <#else>
                <li>
                    <p>${msg("loginTotpStep2")}</p>
                    <div class="qr-code-container">
                        <img id="kc-totp-secret-qr-code" src="data:image/png;base64, ${totp.totpSecretQRCode.encodedQRCode}" alt="QR Code">
                    </div>
                    <p><a href="${totp.manualUrl}" id="mode-manual">${msg("loginTotpUnableToScan")}</a></p>
                </li>
            </#if>
            <li>
                <p>${msg("loginTotpStep3")}</p>
                <p class="subtitle">${msg("loginTotpStep3DeviceName")}</p>
            </li>
        </ol>

        <form id="kc-totp-settings-form" action="${url.loginAction}" method="post">
            <div class="form-group">
                <label for="totp" class="pf-c-form__label">${msg("authenticatorCode")}</label>
                <input type="text" id="totp" name="totp" autocomplete="off" class="pf-c-form-control otp-input"
                       inputmode="numeric" pattern="[0-9]*" maxlength="6"
                       aria-invalid="<#if messagesPerField.existsError('totp')>true</#if>"
                />
                <#if messagesPerField.existsError('totp')>
                    <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('totp'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-group">
                <label for="userLabel" class="pf-c-form__label">${msg("loginTotpDeviceName")}</label>
                <#if totp.otpCredentials?size gte 1>
                    <input type="text" id="userLabel" name="userLabel" class="pf-c-form-control" autocomplete="off"
                           aria-invalid="<#if messagesPerField.existsError('userLabel')>true</#if>"
                    />
                    <#if messagesPerField.existsError('userLabel')>
                        <span class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('userLabel'))?no_esc}
                        </span>
                    </#if>
                <#else>
                    <input type="text" id="userLabel" name="userLabel" class="pf-c-form-control" autocomplete="off"
                           value="${msg("loginTotpDeviceNameDefault")}"
                    />
                </#if>
            </div>

            <input type="hidden" id="totpSecret" name="totpSecret" value="${totp.totpSecret}" />
            <#if mode??><input type="hidden" id="mode" name="mode" value="${mode}"/></#if>

            <div id="kc-form-buttons">
                <#if isAppInitiatedAction??>
                    <input type="submit" class="pf-c-button pf-m-primary pf-m-block" value="${msg("doSubmit")}" />
                    <button type="submit" class="pf-c-button pf-m-secondary pf-m-block" name="cancel-aia" value="true">${msg("doCancel")}</button>
                <#else>
                    <input type="submit" class="pf-c-button pf-m-primary pf-m-block" value="${msg("doSubmit")}" />
                </#if>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
