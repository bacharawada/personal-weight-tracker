<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

    <#if section = "header">
        <div class="weight-tracker-logo">
            <div class="weight-tracker-logo-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M8 12h8M12 8v8"/>
                </svg>
            </div>
            <div class="weight-tracker-logo-title">Weight Tracker</div>
            <div class="weight-tracker-logo-sub">Sign in to your account</div>
        </div>

    <#elseif section = "form">

        <#-- Flash message (wrong credentials, etc.) -->
        <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="alert alert-${message.type}">
                <#if message.type = 'error'><span class="pficon pficon-error-circle-o"></span></#if>
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <#-- Social / IdP buttons (Google etc.) -->
        <#if realm.password && social.providers??>
            <div id="social-providers">
                <#list social.providers as p>
                    <a href="${p.loginUrl}" id="social-${p.alias}"
                       class="btn btn-default btn-wt zocial-${p.alias} <#if p.alias = 'google'>zocial-google</#if>">
                        <#if p.alias = 'google'>
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        <#else>
                            <span class="text-icon">${p.displayName}</span>
                        </#if>
                        <#if p.alias = 'google'>Continue with Google<#else>${p.displayName}</#if>
                    </a>
                </#list>
            </div>

            <#if realm.password>
                <div class="wt-divider"><span>or</span></div>
            </#if>
        </#if>

        <#-- Username / password form -->
        <#if realm.password>
            <form id="kc-form-login" onsubmit="login.disabled = true; return true;"
                  action="${url.loginAction}" method="post">

                <div class="form-group <#if messagesPerField.existsError('username')>has-error</#if>">
                    <label for="username" class="wt-label">
                        <#if !realm.loginWithEmailAllowed>${msg("username")}
                        <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
                        <#else>${msg("email")}</#if>
                    </label>
                    <input tabindex="1" id="username" name="username" type="text"
                           class="wt-input"
                           autofocus
                           autocomplete="username email"
                           value="${(login.username!'')?html}"
                           placeholder="<#if realm.loginWithEmailAllowed>you@example.com<#else>${msg('username')}</#if>"
                    />
                    <#if messagesPerField.existsError('username')>
                        <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group <#if messagesPerField.existsError('password')>has-error</#if>">
                    <label for="password" class="wt-label">${msg("password")}</label>
                    <input tabindex="2" id="password" name="password" type="password"
                           class="wt-input"
                           autocomplete="current-password"
                           placeholder="••••••••"
                    />
                    <#if messagesPerField.existsError('password')>
                        <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                    </#if>
                </div>

                <#-- Remember me + forgot password -->
                <div id="kc-form-options">
                    <#if realm.resetPasswordAllowed>
                        <a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                    </#if>
                </div>

                <div id="kc-form-buttons">
                    <input type="hidden" id="id-hidden-input" name="credentialId"
                           <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                    <input tabindex="4" class="btn btn-wt-primary" name="login" id="kc-login"
                           type="submit" value="${msg('doLogIn')}"/>
                </div>
            </form>
        </#if>

    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration">
                ${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a>
            </div>
        </#if>
    </#if>

</@layout.registrationLayout>
