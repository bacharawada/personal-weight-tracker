<#-- Plain-text alternative of html/executeActions.ftl. -->
<#if user?? && user.firstName?has_content>${msg("wtGreeting", user.firstName)}<#else>${msg("wtGreetingNoName")}</#if>

${msg("wtExecuteActionsIntro")}
<#if requiredActions??><#list requiredActions as requiredAction>
- ${msg("requiredAction.${requiredAction}")}
</#list></#if>

${msg("wtExecuteActionsCta")}:
${link}

${msg("wtLinkExpiry", linkExpirationFormatter(linkExpiration))}

${msg("wtExecuteActionsIgnore")}

--
${msg("wtEmailFooter")}
