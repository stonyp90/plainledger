<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" <#if realm.internationalizationEnabled>lang="${locale.currentLanguageTag}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>

<body class="login-pf ${properties.kcBodyClass!}">
    <div id="kc-container">
        <div id="kc-container-wrapper">
            <header id="kc-header">
                <div id="kc-header-wrapper">
                    ${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}
                </div>
            </header>

            <#if realm.internationalizationEnabled && locale.supported?size gt 1>
                <div id="kc-locale">
                    <div id="kc-locale-wrapper">
                        <div id="kc-locale-dropdown" class="menu-button-links">
                            <button tabindex="1" id="kc-current-locale-link" aria-label="${msg("languages")}" aria-haspopup="true" aria-expanded="false">
                                ${locale.current}
                            </button>
                            <ul role="menu" tabindex="-1" aria-labelledby="kc-current-locale-link" aria-activedescendant="">
                                <#list locale.supported as l>
                                    <li role="none"><a role="menuitem" id="kc-locale-${l.languageTag}" href="${l.url}">${l.label}</a></li>
                                </#list>
                            </ul>
                        </div>
                    </div>
                </div>
            </#if>

            <div id="kc-content">
                <div id="kc-content-wrapper">
                    <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
                        <#if displayRequiredFields>
                            <div class="subtitle">
                                <span class="subtitle"><span class="required">*</span> ${msg("requiredFields")}</span>
                            </div>
                        </#if>
                    <#else>
                        <#if displayRequiredFields>
                            <div class="subtitle">
                                <span class="subtitle"><span class="required">*</span> ${msg("requiredFields")}</span>
                            </div>
                        </#if>
                        <div id="kc-username" class="user-info">
                            <span id="kc-attempted-username">${auth.attemptedUsername}</span>
                            <a id="reset-login" href="${url.loginRestartFlowUrl}">
                                <span class="back-text">${msg("restartLoginTooltip")}</span>
                            </a>
                        </div>
                    </#if>

                    <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <div class="alert alert-${message.type}">
                            <#if message.type = 'success'><span class="icon">✓</span></#if>
                            <#if message.type = 'warning'><span class="icon">⚠</span></#if>
                            <#if message.type = 'error'><span class="icon">✕</span></#if>
                            <#if message.type = 'info'><span class="icon">ℹ</span></#if>
                            <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                        </div>
                    </#if>

                    <#nested "form">

                    <#if auth?has_content && auth.showTryAnotherWayLink()>
                        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                            <div class="try-another-way">
                                <input type="hidden" name="tryAnotherWay" value="on"/>
                                <a href="#" id="try-another-way" onclick="document.forms['kc-select-try-another-way-form'].submit();return false;">${msg("doTryAnotherWay")}</a>
                            </div>
                        </form>
                    </#if>

                    <#nested "socialProviders">

                    <#if displayInfo>
                        <div id="kc-info">
                            <div id="kc-info-wrapper">
                                <#nested "info">
                            </div>
                        </div>
                    </#if>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Locale dropdown toggle
        document.addEventListener('DOMContentLoaded', function() {
            var localeBtn = document.getElementById('kc-current-locale-link');
            var localeDropdown = document.querySelector('#kc-locale ul');
            if (localeBtn && localeDropdown) {
                localeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    localeDropdown.classList.toggle('show');
                });
                document.addEventListener('click', function(e) {
                    if (!e.target.closest('#kc-locale')) {
                        localeDropdown.classList.remove('show');
                    }
                });
            }
        });
    </script>
</body>
</html>
</#macro>
