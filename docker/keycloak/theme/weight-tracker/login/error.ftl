<#import "template.ftl" as layout>
<@layout.registrationLayout; section>

    <#if section = "header">
        <div class="weight-tracker-logo">
            <div class="weight-tracker-logo-icon" style="background: rgba(239,68,68,0.1); color: #ef4444;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <div class="weight-tracker-logo-title">Weight Tracker</div>
        </div>

    <#elseif section = "form">
        <div class="alert alert-error">
            <p>${kcSanitize(message.summary)?no_esc}</p>
            <#if skipLink??>
                <p><a href="${skipLink}">${msg("skipLink")}</a></p>
            </#if>
        </div>

        <#if client?? && client.baseUrl?has_content>
            <div style="text-align: center; margin-top: 1.5rem;">
                <a href="${client.baseUrl}" class="btn btn-wt"
                   style="display: inline-flex; width: auto; padding: 0.6rem 1.5rem;">
                    ← ${msg("backToApplication")}
                </a>
            </div>
        </#if>
    </#if>

</@layout.registrationLayout>
