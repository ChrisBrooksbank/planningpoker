# Deploy Planning Poker to Azure App Service

## Prerequisites

- Azure CLI installed (`winget install -e --id Microsoft.AzureCLI`)
- Logged in (`az login`)
- Node.js 20 LTS locally for building
- Python 3 (for creating cross-platform zip on Windows)

## Step 1: Create Azure Resources

```bash
# Resource group (use a region where you have B1 quota)
az group create --name rg-planningpoker --location westeurope

# App Service plan (B1 Linux - minimum tier for WebSocket support)
az appservice plan create \
  --name plan-planningpoker \
  --resource-group rg-planningpoker \
  --sku B1 \
  --is-linux

# Web app (Node 20 LTS)
az webapp create \
  --name planningpoker-<your-unique-name> \
  --resource-group rg-planningpoker \
  --plan plan-planningpoker \
  --runtime "NODE:20-lts"
```

## Step 2: Configure App Service

```bash
APP_NAME=planningpoker-<your-unique-name>
RG=rg-planningpoker

# Enable WebSockets, set startup command, enable Always On
az webapp config set \
  --name $APP_NAME \
  --resource-group $RG \
  --web-sockets-enabled true \
  --startup-file "node dist/server/index.js" \
  --always-on true

# Set environment variables
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RG \
  --settings \
    NODE_ENV=production \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false

# Enable application logging
az webapp log config \
  --name $APP_NAME \
  --resource-group $RG \
  --docker-container-logging filesystem \
  --application-logging filesystem
```

## Step 3: Build & Deploy

```bash
# Build locally
npm run build

# Create deployment zip with forward-slash paths (IMPORTANT on Windows)
# PowerShell's Compress-Archive creates backslash paths that break on Linux.
# Use Python instead:
python3 -c "
import zipfile, os
dirs = ['.next', 'dist', 'node_modules']
files = ['package.json', 'next.config.ts']
with zipfile.ZipFile('deploy.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for d in dirs:
        for root, dirnames, filenames in os.walk(d):
            for fn in filenames:
                filepath = os.path.join(root, fn)
                zf.write(filepath, filepath.replace(os.sep, '/'))
    for f in files:
        zf.write(f, f)
print('deploy.zip created')
"

# On Linux/macOS you can use zip directly:
# zip -r deploy.zip .next dist node_modules package.json next.config.ts

# Deploy (use --async true for large zips to avoid gateway timeout)
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RG \
  --src-path deploy.zip \
  --type zip \
  --clean true \
  --async true
```

## Step 4: Verify

```bash
# Tail logs
az webapp log tail --name $APP_NAME --resource-group $RG

# Open in browser
az webapp browse --name $APP_NAME --resource-group $RG

# Or check with curl
curl -s https://$APP_NAME.azurewebsites.net -o /dev/null -w "%{http_code}"
```

Test by:
1. Creating a session
2. Opening the room link in a second browser tab
3. Joining and submitting votes from both tabs

## Redeploying

```bash
npm run build
python3 -c "
import zipfile, os
dirs = ['.next', 'dist', 'node_modules']
files = ['package.json', 'next.config.ts']
with zipfile.ZipFile('deploy.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for d in dirs:
        for root, dirnames, filenames in os.walk(d):
            for fn in filenames:
                filepath = os.path.join(root, fn)
                zf.write(filepath, filepath.replace(os.sep, '/'))
    for f in files:
        zf.write(f, f)
"
az webapp deploy --name $APP_NAME --resource-group $RG --src-path deploy.zip --type zip --clean true --async true
```

## Teardown

```bash
az group delete --name rg-planningpoker --yes
```

## Gotchas

- **Windows zip paths**: PowerShell `Compress-Archive` creates zips with backslash
  (`\`) path separators. Azure App Service runs Linux and can't resolve these.
  Always use Python's `zipfile` or a Unix `zip` command.
- **WEBSITE_RUN_FROM_PACKAGE**: Do NOT use this setting. It mounts the zip as a
  read-only filesystem, but Next.js needs to write to
  `node_modules/next/next-swc-fallback` at startup.
- **Region quota**: B1 VM quota varies by region and subscription. If creation
  fails with a quota error, try a different region (e.g. `westeurope`, `uksouth`).
- **Large zip deploy timeout**: The 167MB zip (mostly `node_modules`) can cause
  504 gateway timeouts. Use `--async true` to avoid this.
