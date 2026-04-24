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
        </div>

    <#elseif section = "form">

        <#if message?has_content>
            <p class="instruction">${kcSanitize(message.summary)?no_esc}</p>
        </#if>

        <#if requiredActions??>
            <b>
                <#list requiredActions>
                    <#items as reqActionItem>
                        ${msg("requiredAction.${reqActionItem}")}
                        <#sep>, </#sep>
                    </#items>
                </#list>
            </b>
        </#if>

        <#if skipLink??>
            <div style="text-align: center; margin-top: 1.5rem;">
                <a href="${skipLink}">${msg("skipLink")}</a>
            </div>
        </#if>

        <#if pageRedirectUri?has_content>
            <div style="text-align: center; margin-top: 1.5rem;">
                <a href="${pageRedirectUri}" class="btn btn-wt-primary"
                   style="display: inline-flex; width: auto; padding: 0.6rem 1.5rem;">
                    ${msg("backToApplication")}
                </a>
            </div>
        <#elseif actionUri?has_content>
            <div style="text-align: center; margin-top: 1.5rem;">
                <a href="${actionUri}" class="btn btn-wt-primary"
                   style="display: inline-flex; width: auto; padding: 0.6rem 1.5rem;">
                    ${msg("proceedWithAction")}
                </a>
            </div>
        <#elseif (client.baseUrl)?has_content>
            <div style="text-align: center; margin-top: 1.5rem;">
                <a href="${client.baseUrl}" class="btn btn-wt"
                   style="display: inline-flex; width: auto; padding: 0.6rem 1.5rem;">
                    ← ${msg("backToApplication")}
                </a>
            </div>
        </#if>
    </#if>

</@layout.registrationLayout>
