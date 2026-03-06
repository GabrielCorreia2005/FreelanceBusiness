"""
Email Outreach System
=====================
Reads leads CSV, sends personalised cold emails automatically.
Tracks who was contacted, when, and responses.

Setup:
  pip install python-dotenv
  Create .env with: EMAIL_ADDRESS, EMAIL_PASSWORD, EMAIL_HOST

Usage:
  python outreach.py --csv leads/leads_agencias_20260305.csv --limit 20
  python outreach.py --csv leads/leads_restaurantes.csv --template restaurant
"""
import smtplib
import csv
import os
import json
import time
import argparse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS  = os.getenv("EMAIL_ADDRESS", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_HOST     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT     = int(os.getenv("EMAIL_PORT", "587"))

SENT_LOG = "agency/sent_log.json"

# ─── Templates ────────────────────────────────────────────────────────────────

TEMPLATES = {
    "default": {
        "subject": "Poupo {hours}h/semana à {company} — posso mostrar como?",
        "body": """Olá,

Reparei que a {company} trabalha em {category}. Muitas das tarefas repetitivas que a equipa faz diariamente podem ser 100% automatizadas com AI.

Empresas semelhantes já poupam 15-20 horas por semana com sistemas que eu implemento.

Posso fazer uma análise gratuita de 10 minutos para mostrar exactamente o que pode ser automatizado no caso da {company}?

Cumprimentos,
Gabriel Correia\nPulso Digital

P.S. Não há chamadas necessárias — toda a comunicação pode ser por email ou WhatsApp se preferir."""
    },

    "restaurant": {
        "subject": "Automatize as reservas e respostas da {company} com AI",
        "body": """Olá,

Trabalho com restaurantes a automatizar reservas, respostas no Instagram/Google, e reports semanais usando AI.

A maioria dos meus clientes poupa 2-3 horas por dia sem qualquer custo de staff adicional.

Posso enviar-lhe um resumo de como funcionaria especificamente para a {company}?

Cumprimentos,
Gabriel Correia\nPulso Digital"""
    },

    "agency": {
        "subject": "Automatizo reports e processos da {company} com AI — interesse?",
        "body": """Olá,

Ajudo agências de marketing a automatizar relatórios de campanhas, análise de dados e publicação de conteúdo com AI.

Os meus clientes típicos poupam 20+ horas/semana que a equipa gastava em tarefas repetitivas.

Posso fazer uma análise grátis dos processos da {company} que têm maior potencial de automação?

Cumprimentos,
Gabriel Correia\nPulso Digital"""
    }
}

# ─── Logging ──────────────────────────────────────────────────────────────────

def load_sent_log() -> dict:
    if os.path.exists(SENT_LOG):
        with open(SENT_LOG, "r") as f:
            return json.load(f)
    return {}

def save_sent_log(log: dict):
    with open(SENT_LOG, "w") as f:
        json.dump(log, f, indent=2)

# ─── Email ────────────────────────────────────────────────────────────────────

def send_email(to_email: str, subject: str, body: str, dry_run: bool = False) -> bool:
    if dry_run:
        print(f"   [DRY RUN] Would send to: {to_email}")
        print(f"   Subject: {subject}")
        return True

    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        print("❌ EMAIL_ADDRESS or EMAIL_PASSWORD not set in .env")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

# ─── Main ─────────────────────────────────────────────────────────────────────

def run_outreach(csv_path: str, template: str = "default", limit: int = 20,
                 hours: str = "15", dry_run: bool = False):
    if not os.path.exists(csv_path):
        print(f"❌ CSV not found: {csv_path}")
        return

    sent_log = load_sent_log()
    tmpl = TEMPLATES.get(template, TEMPLATES["default"])

    with open(csv_path, newline="", encoding="utf-8") as f:
        leads = list(csv.DictReader(f))

    print(f"📋 Loaded {len(leads)} leads from {csv_path}")
    print(f"📧 Template: {template} | Limit: {limit} | Dry run: {dry_run}\n")

    sent = 0
    skipped = 0

    for lead in leads:
        if sent >= limit:
            break

        email = lead.get("email", "").strip()
        name = lead.get("name", "Unknown").strip()
        category = lead.get("category", "negócio").strip()

        if not email:
            skipped += 1
            continue

        if email in sent_log:
            print(f"  ⏭️  Skip (already contacted): {name} <{email}>")
            skipped += 1
            continue

        subject = tmpl["subject"].format(company=name, hours=hours, category=category)
        body = tmpl["body"].format(company=name, hours=hours, category=category)

        print(f"  📤 Sending to: {name} <{email}>")
        success = send_email(email, subject, body, dry_run=dry_run)

        if success:
            sent_log[email] = {
                "name": name, "sent_at": datetime.now().isoformat(),
                "template": template, "status": "sent"
            }
            sent += 1
            print(f"     ✅ Sent ({sent}/{limit})")
            if not dry_run:
                time.sleep(2)  # avoid spam filters
        else:
            skipped += 1

    save_sent_log(sent_log)
    print(f"\n📊 Done: {sent} sent, {skipped} skipped")
    print(f"📁 Log saved to: {SENT_LOG}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Email outreach automation")
    parser.add_argument("--csv", required=True, help="Path to leads CSV")
    parser.add_argument("--template", default="default", choices=TEMPLATES.keys())
    parser.add_argument("--limit", type=int, default=20, help="Max emails to send")
    parser.add_argument("--hours", default="15", help="Hours saved (for template)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    args = parser.parse_args()

    run_outreach(args.csv, args.template, args.limit, args.hours, args.dry_run)
