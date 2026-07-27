<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("wtEmailVerificationTitle") preheader=msg("wtEmailVerificationPreheader")>
    <@layout.paragraph><#if user?? && user.firstName?has_content>${msg("wtGreeting", user.firstName)}<#else>${msg("wtGreetingNoName")}</#if></@layout.paragraph>
    <@layout.paragraph>${msg("wtEmailVerificationIntro")}</@layout.paragraph>
    <@layout.paragraph muted=true>${msg("wtLinkExpiry", linkExpirationFormatter(linkExpiration))}</@layout.paragraph>
    <@layout.button link=link label=msg("wtEmailVerificationCta") />
    <@layout.paragraph muted=true>${msg("wtEmailVerificationIgnore")}</@layout.paragraph>
</@layout.emailLayout>
