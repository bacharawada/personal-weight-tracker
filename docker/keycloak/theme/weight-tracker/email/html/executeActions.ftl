<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("wtExecuteActionsTitle") preheader=msg("wtExecuteActionsPreheader")>
    <@layout.paragraph><#if user?? && user.firstName?has_content>${msg("wtGreeting", user.firstName)}<#else>${msg("wtGreetingNoName")}</#if></@layout.paragraph>
    <@layout.paragraph>${msg("wtExecuteActionsIntro")}</@layout.paragraph>

    <#-- The required-action aliases are resolved against the requiredAction.*
         keys in this theme's bundles; an alias with no key falls back to the
         raw alias rather than breaking the mail. -->
    <#if requiredActions??>
    <ul class="wt-text" style="margin:0 0 16px; padding-left:20px; font-family:${layout.wtFont}; font-size:15px; line-height:23px; color:#374151;">
        <#list requiredActions as requiredAction>
        <li style="margin-bottom:4px;">${msg("requiredAction.${requiredAction}")}</li>
        </#list>
    </ul>
    </#if>

    <@layout.paragraph muted=true>${msg("wtLinkExpiry", linkExpirationFormatter(linkExpiration))}</@layout.paragraph>
    <@layout.button link=link label=msg("wtExecuteActionsCta") />
    <@layout.paragraph muted=true>${msg("wtExecuteActionsIgnore")}</@layout.paragraph>
</@layout.emailLayout>
