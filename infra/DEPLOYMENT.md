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

## Deferred / follow-ups

- **CI/CD (GitHub Actions OIDC):** blocked until a tenant admin creates a service
  principal (or grants `Application Developer`). Then set `enable_github_oidc = true`,
  re-apply, set the repo secrets from `terraform output github_actions_secrets`, and
  the `infra.yml` / `app.yml` workflows take over.
- **Keycloak custom login theme:** `enable_keycloak_theme = false`. The upload of
  deeply-nested theme dirs races (Azure Files needs parents created first) and the
  path double-nests. Fix the ordering/path in `storage.tf` before re-enabling.
