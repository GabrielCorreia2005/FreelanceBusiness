---
name: idea-to-product
description: Turn a product idea into a working API, Chrome Extension, or digital product ready to publish and sell
---

# Skill: Idea to Product

## Overview

This skill converts a product idea into a fully deployable product (API, Chrome Extension, or Digital Product).

## Instructions

### Step 1: Validate the Idea

Before building, quickly check:

1. Does it already exist on RapidAPI with 1000+ subscribers? (saturated)
2. Can it be built in under 2 hours? (scope limit)
3. Does it solve a real problem developers/businesses have?

### Step 2: Choose Product Type

| If the idea is... | Build as... |
|---|---|
| A utility function (convert, validate, generate) | API on RapidAPI |
| Something that enhances browsing experience | Chrome Extension |
| A template, prompt, or guide | Digital Product on Gumroad |

### Step 3: Build It

**For APIs** (Node.js + Express):

- File: `apis/<name>-api/index.js`
- Must have: `/health` endpoint, API key auth, error handling
- Package: `package.json` with dependencies
- Test: `npm install && npm start`

**For Chrome Extensions** (Manifest v3):

- Files: `manifest.json`, `popup.html`, `popup.js`, `background.js`, icons
- Test: Load unpacked in Chrome Developer Mode

**For Digital Products**:

- Create in `ideas/products/<name>/`
- Format: Markdown/Notion/PDF
- Price: $9-29 depending on value

### Step 4: Deploy

**APIs**: Railway.app → RapidAPI (see `/deploy-api` workflow)  
**Extensions**: Chrome Web Store ($5 one-time account)  
**Products**: Gumroad (free, 10% per sale)

### Step 5: Track

Always update `ideas/IDEAS_PIPELINE.md`:

- Mark idea as ✅ Built → ✅ Deployed → ✅ Live
- Add URL and pricing details
- Track first sale date

## Quick API Template

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || 'test-key';

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// YOUR ENDPOINT HERE
app.post('/process', async (req, res) => {
  // logic here
});

app.listen(process.env.PORT || 3000, () => console.log('API running'));
```
