<#--
  Shared layout for every Weight Tracker transactional email.

  Mail clients are not browsers. The constraints this file works around:
    - No external stylesheet, no <link>: everything critical is inlined.
    - No flexbox/grid in Outlook (Word rendering engine): nested tables only.
    - No inline SVG in Gmail: the logo mark is a styled table cell with a
      "+" glyph rather than the crosshair icon used on the login page.
    - The <style> block only carries dark-mode and small-screen overrides.
      Apple Mail, iOS Mail and Outlook.com honour prefers-color-scheme;
      everyone else keeps the inline light styles, which is why those
      overrides need !important to beat the inline declarations.

  Palette and radii mirror the login theme (login/resources/css/styles.css)
  so the reset flow looks like one product from mail to landing page.

  Message values must stay free of HTML metacharacters (& < >): Keycloak
  renders .ftl email templates without auto-escaping, so anything in the
  bundles is emitted verbatim.
-->
<#assign wtFont = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

<#macro emailLayout title preheader="">
<!DOCTYPE html>
<html lang="${.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${title}</title>
    <style>
        @media (prefers-color-scheme: dark) {
            .wt-page  { background-color: #030712 !important; }
            .wt-card  { background-color: #111827 !important; border-color: #1f2937 !important; }
            .wt-brand, .wt-title { color: #f9fafb !important; }
            .wt-text  { color: #d1d5db !important; }
            .wt-muted { color: #9ca3af !important; }
            .wt-rule  { background-color: #1f2937 !important; }
            .wt-badge { background-color: #1e3a8a !important; }
        }
        @media only screen and (max-width: 480px) {
            .wt-card-pad { padding: 24px 20px !important; }
        }
    </style>
</head>
<body class="wt-page" style="margin:0; padding:0; width:100%; background-color:#f9fafb; -webkit-font-smoothing:antialiased;">

<#if preheader?has_content>
<div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">${preheader}</div>
</#if>

<table role="presentation" class="wt-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;">
    <tr>
        <td align="center" style="padding:32px 16px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; margin:0 auto;">

                <#-- Brand lockup -->
                <tr>
                    <td align="center" style="padding-bottom:20px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td class="wt-badge" width="40" height="40" align="center" valign="middle" style="width:40px; height:40px; background-color:#dbeafe; border-radius:12px; font-family:${wtFont}; font-size:24px; font-weight:700; line-height:40px; color:#3b82f6;">+</td>
                                <td class="wt-brand" style="padding-left:12px; font-family:${wtFont}; font-size:17px; font-weight:700; letter-spacing:-0.02em; color:#111827;">Weight Tracker</td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <#-- Card -->
                <tr>
                    <td class="wt-card" style="background-color:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td class="wt-card-pad" style="padding:32px;">
                                    <h1 class="wt-title" style="margin:0 0 16px; font-family:${wtFont}; font-size:20px; font-weight:700; line-height:28px; letter-spacing:-0.02em; color:#111827;">${title}</h1>
                                    <#nested>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <#-- Footer -->
                <tr>
                    <td class="wt-muted" align="center" style="padding-top:20px; font-family:${wtFont}; font-size:12px; line-height:18px; color:#6b7280;">${msg("wtEmailFooter")}</td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
</#macro>

<#-- A paragraph of body copy. -->
<#macro paragraph muted=false>
<p class="<#if muted>wt-muted<#else>wt-text</#if>" style="margin:0 0 16px; font-family:${wtFont}; font-size:<#if muted>13px<#else>15px</#if>; line-height:<#if muted>20px<#else>23px</#if>; color:<#if muted>#6b7280<#else>#374151</#if>;"><#nested></p>
</#macro>

<#--
  Call to action. Table-wrapped so Outlook renders a real filled block
  (it drops border-radius, giving square corners — acceptable), and always
  followed by the raw URL so the mail stays usable when the button is
  stripped or the link text is unclickable.
-->
<#macro button link label>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
        <td align="center" bgcolor="#3b82f6" style="background-color:#3b82f6; border-radius:8px;">
            <a href="${link}" style="display:inline-block; padding:12px 28px; font-family:${wtFont}; font-size:15px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:8px;">${label}</a>
        </td>
    </tr>
</table>

<div class="wt-rule" style="height:1px; background-color:#e5e7eb; margin:24px 0; font-size:0; line-height:0;">&nbsp;</div>

<p class="wt-muted" style="margin:0 0 6px; font-family:${wtFont}; font-size:13px; line-height:20px; color:#6b7280;">${msg("wtLinkFallback")}</p>
<p style="margin:0 0 16px; font-family:${wtFont}; font-size:13px; line-height:20px; word-break:break-all;"><a href="${link}" style="color:#3b82f6; text-decoration:underline;">${link}</a></p>
</#macro>
