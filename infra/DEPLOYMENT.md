# Deployment runbook — Weight Tracker on Azure

Everything learned during the first production deploy (2026-07-05), so the next
one is smooth. Read the **Environment gotchas** section first — most of the pain
came from the local environment, not the config.

- **Subscription:** `Bachar AWADA (BTBS)` — `c132d870-3324-4597-9360-f27089839387`
- **Tenant:** `37f626ab-77a8-4087-9c44-ef395de90a98`
- **Region:** `francecentral` · **Resource group:** `rg-baw-weighttracker-prd`
- **Domains:** `weighttracker.bawada.fr` (app), `weighttracker-auth.bawada.fr` (Keycloak)
- **State:** local (`infra/terraform.tfstate`, gitignored) — lives only on this machine.

---

## Environment gotchas (the stuff that actually bit us)

| Symptom | Cause | Fix |
|---|---|---|
| `terraform init` fails: `wsarecv: connection forcibly closed` | The Windows host network blocks the HashiCorp registry (corporate proxy). | **Run all Terraform under WSL**, not Windows PowerShell. WSL reuses the Windows `az.exe` login. |
| `az` errors: `token_expired ... AADSTS70043 ... sign-in frequency` | Conditional-access token expiry. | `az login --tenant 37f626ab-77a8-4087-9c44-ef395de90a98` then `az account set --subscription c132d870-...`. |
| Terraform `import` fails: `invalid control character in URL` | `az ... -o tsv` returns CRLF under WSL. | Pipe through `tr -d '\r'` whenever capturing az output into a variable. |
| `MissingSubscriptionRegistration: 'Microsoft.App'` (409) | Resource providers not registered on a fresh subscription. | `az provider register --namespace Microsoft.App` and `Microsoft.OperationalInsights`; wait for `Registered`. One-time per subscription. |
| `Could not create application ... Authorization_RequestDenied` (403) | We have **subscription rights only, no tenant/directory admin** — can't create AAD apps / service principals. | `enable_github_oidc = false` (default). Deploy manually (below). CI/CD needs an admin to create the SP once. |
| Container App Environment: `unimplemented polling status "Unknown"` | azurerm provider bug polling the env create. **The env is created in Azure anyway.** | Wait for `provisioningState = Succeeded`, `terraform import azurerm_container_app_environment.main <id>`, re-apply. `ignore_changes = [infrastructure_resource_group_name]` (already in `container_env.tf`) stops the import from forcing a replace. |
| `ContainerAppInvalidName ... between 2 and 32 characters` | Keycloak app name was 33 chars. | Already renamed to `ca-baw-weighttracker-kc-prd`. Keep new container app names ≤ 32 chars. |
| Keycloak up but `/realms/weight-tracker` → 404 | Realm file mounted at `/opt/keycloak/config-mount` but `--import-realm` reads `/opt/keycloak/data/import`. | Already fixed: realm-export.json sits at the share root, mounted at `/opt/keycloak/data/import`. |
| `az acr build` crashes: `'charmap' codec can't encode '✓'` | Windows az client (cp1252) chokes streaming vite's `✓`. **The remote build still succeeds.** | Ignore the client crash; poll `az acr task show-run --registry crbawweighttrackerprd --run-id <id> --query status`. |
| CNAME target from `terraform output` doesn't work | The output prints `latest_revision_fqdn` (has a revision suffix that changes every deploy). | Use the **stable** ingress FQDN: `az containerapp show ... --query properties.configuration.ingress.fqdn`. |

---

## First-time bootstrap (fresh subscription)

Run from WSL. `az` must be logged into the right tenant/subscription (see table).

```bash
# 0. One-time provider registration (skip if already Registered)
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

# 1. Fill infra/terraform.tfvars (gitignored). Required: subscription_id,
#    github_repo, keycloak_admin_password. Everything else has defaults.

# 2. Provision. The Container App Environment MAY fail once with the
#    "unimplemented polling status" bug — that's expected.
cd /mnt/c/Users/bawada/Desktop/Personnel/weight_analysis/infra
terraform init
terraform apply -auto-approve

# 2b. IF the env step errored: import it, then re-apply.
ENVID=$(az containerapp env show -n cae-baw-weighttracker-prd \
  -g rg-baw-weighttracker-prd --query id -o tsv | tr -d '\r')
terraform import azurerm_container_app_environment.main "$ENVID"
terraform apply -auto-approve
```

The app and Keycloak containers boot on a placeholder / the real image; the app
runs Alembic migrations at startup (`entrypoint.sh`) against the private DB —
there is no separate migration pipeline (a private DB is unreachable from CI).

---

## Deploy / redeploy the app (manual — current path)

No local Docker needed; the image is built inside ACR.

```bash
cd /mnt/c/Users/bawada/Desktop/Personnel/weight_analysis
SHA=$(git rev-parse --short HEAD)

az acr build --registry crbawweighttrackerprd \
  --image ca-baw-weighttracker-prd:latest \
  --image ca-baw-weighttracker-prd:$SHA \
  --build-arg VITE_KEYCLOAK_URL=https://weighttracker-auth.bawada.fr \
  --build-arg VITE_KEYCLOAK_REALM=weight-tracker \
  --build-arg VITE_KEYCLOAK_CLIENT_ID=weight-tracker-frontend \
  --file Dockerfile .
# If the client crashes mid-stream, poll the run:
#   az acr task list-runs --registry crbawweighttrackerprd --top 1 -o table
#   az acr task show-run --registry crbawweighttrackerprd --run-id <id> --query status

az containerapp update -n ca-baw-weighttracker-prd -g rg-baw-weighttracker-prd \
  --image crbawweighttrackerprd.azurecr.io/ca-baw-weighttracker-prd:$SHA
```

Verify:

```bash
FQDN=$(az containerapp show -n ca-baw-weighttracker-prd -g rg-baw-weighttracker-prd \
  --query properties.configuration.ingress.fqdn -o tsv | tr -d '\r')
curl -s -o /dev/null -w "%{http_code}\n" "https://$FQDN/api/health"   # want 200
az containerapp logs show -n ca-baw-weighttracker-prd -g rg-baw-weighttracker-prd --type console --tail 40
```

---

## Custom domain + TLS

1. Add DNS records at the `bawada.fr` registrar (CNAME target = the **stable**
   ingress FQDN; the `asuid` TXT = `customDomainVerificationId`, get it via
   `az containerapp show ... --query properties.customDomainVerificationId`):

   ```
   CNAME  weighttracker             <app ingress fqdn>
   TXT    asuid.weighttracker       <verificationId>
   CNAME  weighttracker-auth        <keycloak ingress fqdn>
   TXT    asuid.weighttracker-auth  <verificationId>
   ```

2. After propagation, it's a **two-step** flow per host — `add` first, then
   `bind`. A lone `bind` fails with `RequireCustomHostnameInEnvironment`, and
   `bind` needs `--environment` or it errors asking for `--certificate`.

   ```bash
   RG=rg-baw-weighttracker-prd; ENV=cae-baw-weighttracker-prd

   # Step 1 — add + validate the hostname (bindingType: Disabled, no cert yet)
   az containerapp hostname add -n ca-baw-weighttracker-prd -g $RG --hostname weighttracker.bawada.fr
   az containerapp hostname add -n ca-baw-weighttracker-kc-prd -g $RG --hostname weighttracker-auth.bawada.fr

   # Step 2 — bind + issue the managed TLS cert (bindingType: SniEnabled)
   az containerapp hostname bind -n ca-baw-weighttracker-prd -g $RG \
     --hostname weighttracker.bawada.fr --environment $ENV --validation-method CNAME
   az containerapp hostname bind -n ca-baw-weighttracker-kc-prd -g $RG \
     --hostname weighttracker-auth.bawada.fr --environment $ENV --validation-method CNAME
   ```

   Verify: both custom domains return 200 over HTTPS, and the OIDC issuer uses
   the custom domain (`curl .../realms/weight-tracker/.well-known/openid-configuration`).

Auth only works once `weighttracker-auth.bawada.fr` is bound, because the SPA's
`VITE_KEYCLOAK_URL` and the realm redirect URIs are pinned to the custom domains.

---

## Outgoing mail (Keycloak "Forgot password?")

Provider is **Brevo** (free tier, 300 mails/day, real SMTP relay). Azure
Communication Services was ruled out: its SMTP relay authenticates through an
Entra ID app registration + a custom RBAC role, which this account cannot create
(same tenant-rights blocker as the GitHub OIDC service principal), and it has no
free tier.

1. DNS on `bawada.fr` (OVH). The sender domain **cannot** be
   `weighttracker.bawada.fr` — that name is a CNAME to the ingress, and a CNAME
   cannot coexist with the TXT record Brevo needs for verification.

   ```
   TXT  bawada.fr                  brevo-code:<hash>            (from Brevo)
   TXT  mail._domainkey.bawada.fr  <brevo DKIM public key>      (from Brevo)
   TXT  _dmarc.bawada.fr           v=DMARC1; p=none;
   ```

   The existing SPF record must be **edited**, not duplicated — one TXT SPF per
   name, and it ends in `-all` (hard fail), so Brevo has to be included:

   ```
   v=spf1 include:mx.ovh.com include:spf.brevo.com -all
   ```

2. Brevo → SMTP & API → SMTP tab: copy the SMTP login and generate an SMTP key.
   Put both in the local `.env` (`SMTP_USER` / `SMTP_PASSWORD`).

3. Apply to the prod realm. The SMTP config is realm-level and lives in
   Keycloak's Postgres, so this is a one-shot that survives new revisions —
   nothing to inject at container startup, no Terraform change. The prod
   Keycloak ingress is public, so drive it from a container:

   ```bash
   docker compose exec \
     -e KEYCLOAK_URL=https://weighttracker-auth.bawada.fr \
     -e KEYCLOAK_ADMIN_PASSWORD='<prod-admin-password>' \
     keycloak /opt/keycloak/bin/configure-smtp.sh
   ```

   **This does not work from the current workstation**, for two stacked reasons:
   there is no Docker (podman only — `podman run --rm -i --entrypoint sh
   --env-file .env … quay.io/keycloak/keycloak:26.0 -s < configure-smtp.sh` is
   the equivalent), and the podman WSL machine has **no egress to the prod
   ingress on 443** (`Connection timed out` to `4.178.254.95`) even though the
   Windows host reaches it fine. Note this is the mirror image of the Terraform
   gotcha above, where the host is blocked and WSL works — check which side has
   connectivity before assuming.

   Fallback that does work from the host, and what was actually used: the admin
   REST API. Get a token from `master` (`client_id=admin-cli`, password grant,
   creds from `terraform.tfvars`), then send a **partial** PUT to
   `/admin/realms/weight-tracker` with only `{"smtpServer": {...}}`.
   `RepresentationToModel.updateRealm` applies non-null fields only, so nothing
   else on the realm is touched — verified by diffing the realm representation
   before and after (empty diff). Keycloak masks the SMTP password on read.

   Verify with a real "Forgot password?" from `https://weighttracker.bawada.fr`.
   Keycloak's own "Test connection" button (Realm settings → Email) only proves
   the relay accepts the credentials, not that the mail is delivered — check
   Brevo's transactional log if it doesn't land.

---

## Client Root/Base URL (the "Back to application" button)

Symptom: on the password-reset info page ("email sent") and on any Keycloak
error page, the **← Back to application** button sends the user to
`http://localhost:5173`.

Cause: the login theme links that button to `${client.baseUrl}`, and Keycloak
derives `pageRedirectUri` from the same Root/Base URL pair. `docker/keycloak/
realm-export.json` ships `rootUrl` / `baseUrl` = `http://localhost:5173` — right
for dev, and the prod realm was created from that export on first boot, so prod
inherited the dev URL. The `redirectUris` / `webOrigins` lists do contain
`https://weighttracker.bawada.fr`, which is why login itself works; only these
two fields are wrong. Editing the export does **not** fix an existing realm
(`--import-realm` runs on first boot only).

Fix — `docker/keycloak/configure-client-urls.sh` (idempotent, kcadm, mounted
into the container by `docker-compose.yml`). It touches `rootUrl` and `baseUrl`
only; `redirectUris` / `webOrigins` are left alone because a kcadm `-s` would
replace the whole list and drop the localhost entries.

Local (no-op — the default `APP_BASE_URL` is already the dev URL; the mounted
script is mode 644, hence the explicit `sh`). Run it **from WSL**: `dev.sh`
drives the rootless podman inside WSL, and `podman.exe` on the Windows host
talks to a different machine that cannot see those containers.

```bash
podman-compose exec keycloak sh /opt/keycloak/bin/configure-client-urls.sh
```

Prod — throwaway container, script on stdin (no compose involved):

```bash
podman run --rm -i --entrypoint sh -e KEYCLOAK_URL=https://weighttracker-auth.bawada.fr -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD='<prod-admin-password>' -e APP_BASE_URL=https://weighttracker.bawada.fr quay.io/keycloak/keycloak:24.0 -s < docker/keycloak/configure-client-urls.sh
```

Same connectivity caveat as the SMTP script above: this workstation has podman
only (no Docker), and the podman WSL machine has no egress to the prod ingress
on 443 — so the prod form above times out from here. Fallback that works from
the host — admin REST API, token from `master` (`client_id=admin-cli`, password
grant), then:

```
GET /admin/realms/weight-tracker/clients?clientId=weight-tracker-frontend   → take .[0].id
PUT /admin/realms/weight-tracker/clients/<id>  {"rootUrl": "https://weighttracker.bawada.fr", "baseUrl": "https://weighttracker.bawada.fr"}
```

A client PUT is a **full** representation update, unlike the partial realm PUT
used for SMTP: send back the object from the GET with only those two fields
changed, otherwise the rest of the client config is wiped. Round-tripping the
GET response is exactly what the snippet below does — from the Windows host,
which does reach the ingress:

```powershell
$kc  = "https://weighttracker-auth.bawada.fr"
$app = "https://weighttracker.bawada.fr"
$sec = Read-Host "Keycloak admin password" -AsSecureString
$pw  = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$tok = (Invoke-RestMethod -Method Post "$kc/realms/master/protocol/openid-connect/token" -Body @{ grant_type = 'password'; client_id = 'admin-cli'; username = 'admin'; password = $pw }).access_token
$h   = @{ Authorization = "Bearer $tok" }
$c   = (Invoke-RestMethod "$kc/admin/realms/weight-tracker/clients?clientId=weight-tracker-frontend" -Headers $h)[0]
$c.rootUrl = $app
$c.baseUrl = $app
Invoke-RestMethod -Method Put "$kc/admin/realms/weight-tracker/clients/$($c.id)" -Headers $h -ContentType 'application/json' -Body ($c | ConvertTo-Json -Depth 10)
Invoke-RestMethod "$kc/admin/realms/weight-tracker/clients/$($c.id)" -Headers $h | Select-Object clientId, rootUrl, baseUrl
```

`-AsSecureString` keeps the admin password out of the shell history; `-Depth 10`
matters because a shallower `ConvertTo-Json` truncates the client's nested
`attributes` / `protocolMappers` into strings and the PUT then loses them.

Verify: trigger "Forgot password?" in prod and hover the button on the
confirmation page.

---

## Realm branding & i18n (custom themes, fr/en)

Two moving parts that deploy **differently**, and the order matters.

| What | Where it lives | How it ships |
|---|---|---|
| The templates (`login/`, `email/`) | `docker/keycloak/theme/weight-tracker/` | Baked into the Keycloak **image** → rebuild + new revision |
| The pointers (`loginTheme`, `emailTheme`, `internationalizationEnabled`, `supportedLocales`, `defaultLocale`) | Keycloak's Postgres, realm-level | Hot, via the admin REST API |

**Always image first, realm second.** Flipping `emailTheme` to `weight-tracker`
before the image carries `email/` leaves Keycloak unable to resolve the theme
when a reset mail is requested. Same for i18n: enabling `fr` before the image
carries `login/messages/messages_fr.properties` makes the login page render raw
message keys (`wtLoginSubtitle`) instead of text, because Keycloak falls back to
the key name when a bundle entry is missing.

`realm-export.json` carries all of these too, but it is only read on **first**
boot (`--import-realm`) — editing it does nothing to the existing prod realm. It
is kept in sync so a fresh realm starts out correct.

### 1. Rebuild and deploy the Keycloak image

Build context is `docker/keycloak` (the Dockerfile `COPY`s the whole theme dir,
so `email/` is picked up with no Dockerfile change). Keycloak discovers themes
under `/opt/keycloak/themes` at runtime — no `kc.sh build` step needed.

```bash
cd /mnt/c/Users/bawada/Desktop/Personnel/weight_analysis/docker/keycloak
SHA=$(git rev-parse --short HEAD)

az acr build --registry crbawweighttrackerprd \
  --image keycloak-weighttracker:$SHA \
  --image keycloak-weighttracker:latest \
  --file Dockerfile .

az containerapp update -n ca-baw-weighttracker-kc-prd -g rg-baw-weighttracker-prd \
  --image crbawweighttrackerprd.azurecr.io/keycloak-weighttracker:$SHA
```

### 2. Point the realm at the themes and turn on fr/en

`configure-branding.sh` is the container-side equivalent, and it is what works
for the **local** stack:

```bash
podman-compose exec keycloak sh /opt/keycloak/bin/configure-branding.sh
```

For **prod** that path is blocked for the same two stacked reasons as the SMTP
config (no Docker, and the podman WSL machine has no egress to the prod ingress
on 443). Use the admin REST API from the Windows host, which does reach it. A
**partial** PUT only applies the fields it contains, so nothing else on the
realm is touched:

```powershell
$kc    = "https://weighttracker-auth.bawada.fr"
$admin = "<keycloak admin user>"
$pass  = Read-Host "Keycloak admin password" -AsSecureString |
           ConvertFrom-SecureString -AsPlainText          # PowerShell 7+

$tok = (Invoke-RestMethod -Method Post -Uri "$kc/realms/master/protocol/openid-connect/token" `
          -ContentType 'application/x-www-form-urlencoded' `
          -Body @{ client_id = 'admin-cli'; grant_type = 'password'
                   username = $admin; password = $pass }).access_token

$body = @{
    emailTheme                  = 'weight-tracker'
    internationalizationEnabled = $true
    supportedLocales            = @('en', 'fr')
    defaultLocale               = 'en'
} | ConvertTo-Json

Invoke-RestMethod -Method Put -Uri "$kc/admin/realms/weight-tracker" `
    -Headers @{ Authorization = "Bearer $tok" } `
    -ContentType 'application/json' -Body $body

Invoke-RestMethod -Uri "$kc/admin/realms/weight-tracker" -Headers @{ Authorization = "Bearer $tok" } |
    Select-Object loginTheme, emailTheme, internationalizationEnabled, supportedLocales, defaultLocale
```

`loginTheme` is already `weight-tracker` on prod and is left out on purpose.

### How the language is chosen

Keycloak resolves the locale in this order: `kc_locale` query param → the user's
`locale` attribute → the locale cookie → `ui_locales` → the browser
`Accept-Language` header → `defaultLocale`. The SPA sends neither `kc_locale`
nor `ui_locales`, so **the reset mail follows the browser language of whoever
opened the "Forgot password?" page**, not the language picked inside the app.
Making the two agree would mean passing `ui_locales` from `AuthContext` — not
done, see follow-ups.

### Verify

1. `https://weighttracker.bawada.fr` → "Forgot password?" with a French browser:
   the login page is French, and the mail arrives with the French subject
   (*Réinitialisation de votre mot de passe Weight Tracker*), the branded card,
   and a working button.
2. Repeat with `Accept-Language: en` for the English version.
3. Check accents are not mojibake — the bundles are UTF-8 and Keycloak 24 reads
   them as UTF-8, but a bad build would show up here first.
4. If nothing lands, the relay is the suspect, not the theme — check Brevo's
   transactional log (see **Outgoing mail**).

A FreeMarker error in a template surfaces as a 500 on the reset submit, with the
stack trace in `az containerapp logs show -n ca-baw-weighttracker-kc-prd -g rg-baw-weighttracker-prd --type console`.

---

## Deferred / follow-ups

- **CI/CD (GitHub Actions OIDC):** blocked until a tenant admin creates a service
  principal (or grants `Application Developer`). Then set `enable_github_oidc = true`,
  re-apply, set the repo secrets from `terraform output github_actions_secrets`, and
  the `infra.yml` / `app.yml` workflows take over.
- **Keycloak themes via Azure Files:** abandoned, not deferred.
  `enable_keycloak_theme = false` stays false. Uploading deeply-nested theme dirs
  races (Azure Files needs parents created first) and the path double-nests.
  Both the login and the email theme ship inside the Keycloak image instead
  (see **Realm branding & i18n**) — don't revive the `storage.tf` path.
- **Mail language follows the browser, not the app.** The SPA does not pass
  `ui_locales`, so a user reading the app in French on an English-locale browser
  gets an English reset mail. Fix would be one line in
  `frontend/src/context/AuthContext.tsx` (add `ui_locales` to the authorization
  request from the current i18n language) — deliberately out of scope so far.
- **Email templates not overridden** (`event-login_error`,
  `identity-provider-link`, `org-invite`, `email-test`): they fall back to
  `parent=base`, so they render stock and English-only. None is reachable on this
  realm today; add them to `theme/weight-tracker/email/` if that changes.
