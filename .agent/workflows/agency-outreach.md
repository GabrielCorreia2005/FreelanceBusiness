---
description: Run agency lead generation and send outreach emails
---

## Agency Lead Generation & Outreach

// turbo-all

1. Run scraper to find leads:

```powershell
Set-Location d:\GC\FreelanceBusiness
python agency/scraper.py --query "agencias marketing Lisboa" --limit 50 --enrich-emails
```

1. Check the CSV created in `agency/leads/`

2. Test email outreach (dry run first):

```powershell
python agency/outreach.py --csv agency/leads/<filename>.csv --dry-run
```

1. Send real emails (max 20 per day to avoid spam):

```powershell
python agency/outreach.py --csv agency/leads/<filename>.csv --limit 20 --template agency
```

1. Check `agency/sent_log.json` for tracking who was contacted

2. Update `ideas/IDEAS_PIPELINE.md` — Agency pipeline section with status

## Notes

- Use `--template restaurant` for restaurants
- Use `--template agency` for marketing agencies  
- Use `--template default` for other businesses
- Max 20-30 emails/day to avoid Gmail spam filters
- Follow up after 3-5 days if no response
