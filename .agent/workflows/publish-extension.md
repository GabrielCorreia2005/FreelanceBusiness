---
description: Build and publish a Chrome Extension to Chrome Web Store
---

## Build and Publish Chrome Extension

1. Create extension folder in `extensions/<name>/`

2. Required files:
   - `manifest.json` (v3)
   - `popup.html` + `popup.js`
   - `background.js` (service worker)
   - `content.js` (if needed)
   - `icons/` (16, 48, 128px)

3. Test locally:
   - Chrome → More tools → Extensions → Developer mode ON
   - Load unpacked → select extension folder
   - Test all features

4. Prepare for store:
   - Create 5 screenshots (1280×800 or 640×400)
   - Write description (focus on problem solved, not features)
   - Set Privacy Policy URL

5. Publish:
   - Go to chrome.google.com/webstore/devconsole
   - New item → Upload ZIP
   - Fill in all fields
   - Set pricing (Free + in-app purchase for Pro)
   - Submit for review (1-3 days)

6. Update `ideas/IDEAS_PIPELINE.md` — mark extension as ✅ Published

## Pricing Strategy

- Core features: FREE (to get installs)
- Pro features: $2-5/month via Chrome's Payment API or external Stripe
