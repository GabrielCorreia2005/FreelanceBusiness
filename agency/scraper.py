"""
Agency Lead Scraper
===================
Scrapes Google Maps for local businesses (potential automation clients).
Outputs CSV with: name, category, phone, website, email (if findable), address.

Usage:
  python scraper.py --query "restaurantes Lisboa" --limit 50
  python scraper.py --query "agencias marketing Porto" --limit 100
"""
import argparse
import csv
import json
import time
import re
import os
from datetime import datetime
import requests
from urllib.parse import quote_plus

OUTPUT_DIR = "leads"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def scrape_google_maps(query: str, limit: int = 50) -> list[dict]:
    """
    Uses SerpAPI (free tier: 100 searches/month) or Apify Maps Scraper.
    Falls back to manual CSV template if no API key.
    """
    serpapi_key = os.getenv("SERPAPI_KEY", "")
    
    if not serpapi_key:
        print("⚠️  No SERPAPI_KEY found. Creating template CSV instead.")
        print("   Get free key at: https://serpapi.com (100 searches/month free)")
        return _create_template_leads(query, limit)
    
    leads = []
    print(f"🔍 Searching: {query}")
    
    url = "https://serpapi.com/search"
    params = {
        "engine": "google_maps",
        "q": query,
        "api_key": serpapi_key,
        "num": min(limit, 20)
    }
    
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code != 200:
        print(f"❌ SerpAPI error: {resp.status_code}")
        return []
    
    data = resp.json()
    results = data.get("local_results", [])
    
    for r in results:
        leads.append({
            "name": r.get("title", ""),
            "category": r.get("type", ""),
            "rating": r.get("rating", ""),
            "reviews": r.get("reviews", ""),
            "address": r.get("address", ""),
            "phone": r.get("phone", ""),
            "website": r.get("website", ""),
            "email": "",  # filled later
            "hours": r.get("hours", ""),
            "status": "not_contacted"
        })
    
    print(f"✅ Found {len(leads)} businesses")
    return leads

def _create_template_leads(query: str, limit: int) -> list[dict]:
    """Creates a template CSV for manual filling"""
    return [{
        "name": f"[Business {i+1} — search: {query}]",
        "category": "",
        "rating": "",
        "reviews": "",
        "address": "",
        "phone": "",
        "website": "",
        "email": "",
        "hours": "",
        "status": "not_contacted"
    } for i in range(min(limit, 10))]

def extract_email_from_website(website: str) -> str:
    """Try to find email on homepage"""
    if not website:
        return ""
    try:
        if not website.startswith("http"):
            website = "https://" + website
        resp = requests.get(website, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resp.text)
        # Filter out common false positives
        valid = [e for e in emails if not any(x in e.lower() for x in ['example', 'test', 'domain', 'email'])]
        return valid[0] if valid else ""
    except:
        return ""

def save_leads(leads: list[dict], query: str):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    clean_query = re.sub(r'[^\w]', '_', query)[:30]
    filepath = os.path.join(OUTPUT_DIR, f"leads_{clean_query}_{timestamp}.csv")
    
    if not leads:
        print("No leads to save.")
        return
    
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=leads[0].keys())
        writer.writeheader()
        writer.writerows(leads)
    
    print(f"\n💾 Saved {len(leads)} leads → {filepath}")
    return filepath

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Google Maps leads")
    parser.add_argument("--query", default="agencias marketing Lisboa", help="Search query")
    parser.add_argument("--limit", type=int, default=50, help="Max results")
    parser.add_argument("--enrich-emails", action="store_true", help="Try to find emails from websites")
    args = parser.parse_args()
    
    leads = scrape_google_maps(args.query, args.limit)
    
    if args.enrich_emails and leads:
        print("\n📧 Enriching with emails...")
        for i, lead in enumerate(leads):
            if lead.get("website"):
                email = extract_email_from_website(lead["website"])
                lead["email"] = email
                print(f"  {i+1}/{len(leads)} {lead['name']} → {email or 'not found'}")
                time.sleep(0.5)
    
    save_leads(leads, args.query)
    
    # Summary
    with_email = sum(1 for l in leads if l.get("email"))
    with_website = sum(1 for l in leads if l.get("website"))
    print(f"\n📊 Summary:")
    print(f"   Total leads: {len(leads)}")
    print(f"   With website: {with_website}")
    print(f"   With email: {with_email}")
