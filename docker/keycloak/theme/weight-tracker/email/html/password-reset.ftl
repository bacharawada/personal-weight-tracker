<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("wtPasswordResetTitle") preheader=msg("wtPasswordResetPreheader")>
    <@layout.paragraph><#if user?? && user.firstName?has_content>${msg("wtGreeting", user.firstName)}<#else>${msg("wtGreetingNoName")}</#if></@layout.paragraph>
    <@layout.paragraph>${msg("wtPasswordResetIntro")}</@layout.paragraph>
    <@layout.paragraph muted=true>${msg("wtLinkExpiry", linkExpirationFormatter(linkExpiration))}</@layout.paragraph>
    <@layout.button link=link label=msg("wtPasswordResetCta") />
    <@layout.paragraph muted=true>${msg("wtPasswordResetIgnore")}</@layout.paragraph>
</@layout.emailLayout>
