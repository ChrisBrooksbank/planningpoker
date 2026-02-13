# Deploy Planning Poker to Azure App Service

## Prerequisites

- Azure CLI installed (`winget install -e --id Microsoft.AzureCLI`)
- Logged in (`az login`)
- Node.js 20 LTS locally for building

## Step 1: Create Azure Resources

```bash
# Resource group
az group create --name rg-planningpoker --location eastus

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

# Enable WebSockets
az webapp config set \
  --name $APP_NAME \
  --resource-group $RG \
  --web-sockets-enabled true

# Set startup command
az webapp config set \
  --name $APP_NAME \
  --resource-group $RG \
  --startup-file "node dist/server/index.js"

# Set environment variables
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RG \
  --settings \
    NODE_ENV=production \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false

# Enable Always On (prevents idle shutdown, preserves in-memory sessions)
az webapp config set \
  --name $APP_NAME \
  --resource-group $RG \
  --always-on true
```

## Step 3: Build & Deploy

```bash
# Build locally
npm run build

# Create deployment zip (from repo root)
# PowerShell:
Compress-Archive -Path .next, dist, node_modules, package.json, next.config.ts -DestinationPath deploy.zip -Force

# Or bash:
zip -r deploy.zip .next dist node_modules package.json next.config.ts

# Deploy
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RG \
  --src-path deploy.zip \
  --type zip
```

## Step 4: Verify

```bash
# Tail logs
az webapp log tail --name $APP_NAME --resource-group $RG

# Open in browser
az webapp browse --name $APP_NAME --resource-group $RG
```

Test by:
1. Creating a session
2. Opening the room link in a second browser tab
3. Joining and submitting votes from both tabs

## Redeploying

```bash
npm run build
Compress-Archive -Path .next, dist, node_modules, package.json, next.config.ts -DestinationPath deploy.zip -Force
az webapp deploy --name $APP_NAME --resource-group $RG --src-path deploy.zip --type zip
```

## Teardown

```bash
az group delete --name rg-planningpoker --yes
```
