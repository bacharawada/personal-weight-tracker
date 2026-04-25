<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html<#if realm.internationalizationEnabled> lang="${locale.currentLanguageTag}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>

    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />

    <#-- Only load our own stylesheet — no PatternFly / Zocial -->
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>

    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>

    <#-- Keycloak session-checker scripts (needed for auth flow) -->
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if authenticationSession??>
        <script type="module">
            try {
                const { checkCookiesAndSetTimer } = await import("${url.resourcesPath}/js/authChecker.js");
                checkCookiesAndSetTimer(
                  "${authenticationSession.authSessionId}",
                  "${authenticationSession.tabId}",
                  "${url.ssoLoginInOtherTabsUrl?no_esc}"
                );
            } catch (e) {
                // authChecker is non-critical; log and continue
                console.warn("authChecker unavailable:", e);
            }
        </script>
    </#if>
</head>

<body class="weight-tracker-body">

    <div class="weight-tracker-login">

        <#-- Header (logo, title) — rendered by each page template -->
        <div id="kc-header">
            <#nested "header">
        </div>

        <#-- Card containing the form -->
        <div class="weight-tracker-card">

            <#-- "Try another way" auth reset link (e.g. OTP vs password) -->
            <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
                <div id="kc-username" class="kc-username-display">
                    <label id="kc-attempted-username">${auth.attemptedUsername}</label>
                    <a id="reset-login" href="${url.loginRestartFlowUrl}"
                       aria-label="${msg("restartLoginTooltip")}">
                        &larr; ${msg("restartLoginTooltip")}
                    </a>
                </div>
            </#if>

            <#-- Flash / alert messages -->
            <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <div class="alert alert-${message.type}">
                    ${kcSanitize(message.summary)?no_esc}
                </div>
            </#if>

            <#-- Main form content — each page template fills this -->
            <#nested "form">

            <#-- "Try another way" link -->
            <#if auth?has_content && auth.showTryAnotherWayLink()>
                <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                    <div class="form-group" style="margin-top: 1rem;">
                        <input type="hidden" name="tryAnotherWay" value="on"/>
                        <a href="#" id="try-another-way"
                           onclick="document.forms['kc-select-try-another-way-form'].submit();return false;">${msg("doTryAnotherWay")}</a>
                    </div>
                </form>
            </#if>

            <#-- Social / IdP providers (rendered by login.ftl via nested "socialProviders") -->
            <#nested "socialProviders">
        </div>

        <#-- Info section below the card (e.g. registration link) -->
        <#if displayInfo>
            <div id="kc-info">
                <#nested "info">
            </div>
        </#if>

    </div>

</body>
</html>
</#macro>
