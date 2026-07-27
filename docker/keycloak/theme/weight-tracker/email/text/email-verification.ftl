<#-- Plain-text alternative of html/email-verification.ftl. -->
<#if user?? && user.firstName?has_content>${msg("wtGreeting", user.firstName)}<#else>${msg("wtGreetingNoName")}</#if>

${msg("wtEmailVerificationIntro")}

${msg("wtEmailVerificationCta")}:
${link}

${msg("wtLinkExpiry", linkExpirationFormatter(linkExpiration))}

${msg("wtEmailVerificationIgnore")}

--
${msg("wtEmailFooter")}
