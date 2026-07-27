<#--
  Plain-text alternative of html/password-reset.ftl. Keycloak sends both as a
  multipart/alternative, so this has to carry the same information — clients
  that refuse HTML must still be able to complete the reset.
-->
<#if user?? && user.firstName?has_content>${msg("wtGreeting", user.firstName)}<#else>${msg("wtGreetingNoName")}</#if>

${msg("wtPasswordResetIntro")}

${msg("wtPasswordResetCta")}:
${link}

${msg("wtLinkExpiry", linkExpirationFormatter(linkExpiration))}

${msg("wtPasswordResetIgnore")}

--
${msg("wtEmailFooter")}
