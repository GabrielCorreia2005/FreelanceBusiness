---
description: Build and deploy a new API to Railway and RapidAPI
---

## Build and Deploy a New API

// turbo-all

1. Build the API in `apis/<name>-api/` with Express.js — endpoints: GET /health, main endpoint(s), API key auth via `x-api-key` header

2. Create `package.json` with dependencies

3. Test locally:

```powershell
Set-Location d:\GC\FreelanceBusiness\apis\<name>-api
npm install
node index.js
```

1. Push to GitHub:

```powershell
# (if repo not initialized)
git init
git add .
git commit -m "feat: add <name> API"
```

1. Deploy on Railway:
   - Go to railway.app → New Project → Deploy from GitHub
   - Select the `apis/<name>-api` folder
   - Add env vars: `API_KEY=<secret>`, `PORT=3000`
   - Copy the generated URL

2. Publish on RapidAPI:
   - rapidapi.com/provider → Add New API
   - Base URL: (Railway URL)
   - Add endpoints, descriptions, examples
   - Set pricing: Free (100 req/mo), Basic $9/mo, Pro $29/mo

3. Update `ideas/IDEAS_PIPELINE.md` — mark API as ✅ Deployed
