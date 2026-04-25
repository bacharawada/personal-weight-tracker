<#import "template.ftl" as layout>
<@layout.registrationLayout; section>

    <#if section = "header">
        <div class="weight-tracker-logo">
            <div class="weight-tracker-logo-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M8 12h8M12 8v8"/>
                </svg>
            </div>
            <div class="weight-tracker-logo-title">Weight Tracker</div>
            <div class="weight-tracker-logo-sub">Create your account</div>
        </div>

    <#elseif section = "form">

        <#if message?has_content>
            <div class="alert alert-${message.type}">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <form id="kc-register-form" action="${url.registrationAction}" method="post">

            <#-- First name + last name (side by side if space allows) -->
            <div class="form-group <#if messagesPerField.existsError('firstName')>has-error</#if>">
                <label for="firstName" class="wt-label">${msg("firstName")}</label>
                <input type="text" id="firstName" name="firstName" class="wt-input"
                       autocomplete="given-name"
                       value="${(register.formData.firstName!'')}"
                       placeholder="Jane" />
                <#if messagesPerField.existsError('firstName')>
                    <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
                </#if>
            </div>

            <div class="form-group <#if messagesPerField.existsError('lastName')>has-error</#if>">
                <label for="lastName" class="wt-label">${msg("lastName")}</label>
                <input type="text" id="lastName" name="lastName" class="wt-input"
                       autocomplete="family-name"
                       value="${(register.formData.lastName!'')}"
                       placeholder="Doe" />
                <#if messagesPerField.existsError('lastName')>
                    <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
                </#if>
            </div>

            <#-- Email -->
            <div class="form-group <#if messagesPerField.existsError('email')>has-error</#if>">
                <label for="email" class="wt-label">${msg("email")}</label>
                <input type="email" id="email" name="email" class="wt-input"
                       autocomplete="email"
                       value="${(register.formData.email!'')}"
                       placeholder="you@example.com" />
                <#if messagesPerField.existsError('email')>
                    <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
                </#if>
            </div>

            <#-- Username (only shown when email != username) -->
            <#if !realm.registrationEmailAsUsername>
                <div class="form-group <#if messagesPerField.existsError('username')>has-error</#if>">
                    <label for="username" class="wt-label">${msg("username")}</label>
                    <input type="text" id="username" name="username" class="wt-input"
                           autocomplete="username"
                           value="${(register.formData.username!'')}"
                           placeholder="${msg('username')}" />
                    <#if messagesPerField.existsError('username')>
                        <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                    </#if>
                </div>
            </#if>

            <#-- Password -->
            <#if passwordRequired??>
                <div class="form-group <#if messagesPerField.existsError('password')>has-error</#if>">
                    <label for="password" class="wt-label">${msg("password")}</label>
                    <input type="password" id="password" name="password" class="wt-input"
                           autocomplete="new-password"
                           placeholder="••••••••" />
                    <#if messagesPerField.existsError('password')>
                        <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group <#if messagesPerField.existsError('password-confirm')>has-error</#if>">
                    <label for="password-confirm" class="wt-label">${msg("passwordConfirm")}</label>
                    <input type="password" id="password-confirm" name="password-confirm" class="wt-input"
                           autocomplete="new-password"
                           placeholder="••••••••" />
                    <#if messagesPerField.existsError('password-confirm')>
                        <span class="kc-feedback-text">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                    </#if>
                </div>
            </#if>

            <#-- CAPTCHA / reCAPTCHA if configured -->
            <#if recaptchaRequired??>
                <div class="form-group">
                    <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                </div>
            </#if>

            <div id="kc-form-buttons" style="margin-top: 1.25rem;">
                <input class="btn btn-wt-primary" type="submit" value="${msg('doRegister')}"/>
            </div>

        </form>

        <div class="wt-footer-links">
            ${msg("backToLogin")?no_esc} <a href="${url.loginUrl}">${msg("doLogIn")}</a>
        </div>

    </#if>

</@layout.registrationLayout>
