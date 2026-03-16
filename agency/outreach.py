"""
Email Outreach System v2
========================
Reads leads CSV, sends personalised cold emails automatically.
Tracks who was contacted, when, and responses.
Now with FOLLOW-UP system: sends 2nd email after 3 days, 3rd after 7 days.

Setup:
  pip install python-dotenv
  Create .env with: EMAIL_ADDRESS, EMAIL_PASSWORD, EMAIL_HOST

Usage:
  python outreach.py --csv leads/agencias_reais.csv --limit 20
  python outreach.py --csv leads/agencias_reais.csv --template restaurant
  python outreach.py --csv leads/agencias_reais.csv --dry-run
  python outreach.py --follow-up          # Send follow-ups to non-responders
  python outreach.py --follow-up --dry-run
"""
import smtplib
import csv
import os
import json
import time
import argparse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS  = os.getenv("EMAIL_ADDRESS", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_HOST     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT     = int(os.getenv("EMAIL_PORT", "587"))

SENT_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sent_log.json")

# ─── Templates ────────────────────────────────────────────────────────────────

TEMPLATES = {
    "default": {
        "subject": "Poupo {hours}h/semana à {company} — posso mostrar como?",
        "body": """Olá,

Reparei que a {company} trabalha em {category}. Muitas das tarefas repetitivas que a equipa faz diariamente podem ser 100% automatizadas com AI.

Empresas semelhantes já poupam 15-20 horas por semana com sistemas que eu implemento.

Posso fazer uma análise gratuita de 10 minutos para mostrar exactamente o que pode ser automatizado no caso da {company}?

Cumprimentos,
Gabriel Correia
Pulso Digital

P.S. Não há chamadas necessárias — toda a comunicação pode ser por email ou WhatsApp se preferir."""
    },

    "restaurant": {
        "subject": "Automatize as reservas e respostas da {company} com AI",
        "body": """Olá,

Trabalho com restaurantes a automatizar reservas, respostas no Instagram/Google, e reports semanais usando AI.

A maioria dos meus clientes poupa 2-3 horas por dia sem qualquer custo de staff adicional.

Posso enviar-lhe um resumo de como funcionaria especificamente para a {company}?

Cumprimentos,
Gabriel Correia
Pulso Digital"""
    },

    "agency": {
        "subject": "Automatizo reports e processos da {company} com AI — interesse?",
        "body": """Olá,

Ajudo agências de marketing a automatizar relatórios de campanhas, análise de dados e publicação de conteúdo com AI.

Os meus clientes típicos poupam 20+ horas/semana que a equipa gastava em tarefas repetitivas.

Posso fazer uma análise grátis dos processos da {company} que têm maior potencial de automação?

Cumprimentos,
Gabriel Correia
Pulso Digital"""
    },

    "contabilidade": {
        "subject": "AI automatiza reconciliação e relatórios da {company} — posso mostrar?",
        "body": """Olá,

Ajudo gabinetes de contabilidade a automatizar reconciliação bancária, classificação de documentos e geração de relatórios com AI.

Os meus clientes poupam 15-25 horas por semana em tarefas que antes eram feitas manualmente.

Posso mostrar-lhe exactamente que processos da {company} podem ser automatizados?

Cumprimentos,
Gabriel Correia
Pulso Digital

P.S. Toda a comunicação pode ser por email ou WhatsApp — sem chamadas necessárias."""
    },

    "clinica": {
        "subject": "Automatize agendamentos e follow-ups da {company} com AI",
        "body": """Olá,

Trabalho com clínicas a automatizar agendamentos, confirmações de consulta, follow-ups de pacientes e triagem de mensagens com AI.

O resultado típico é poupar 3-4 horas diárias de trabalho administrativo.

Posso enviar-lhe um pequeno relatório de como isto funcionaria para a {company}?

Cumprimentos,
Gabriel Correia
Pulso Digital"""
    },

    "imobiliaria": {
        "subject": "AI para responder leads e qualificar clientes da {company} automaticamente",
        "body": """Olá,

Ajudo imobiliárias a automatizar resposta a leads de portais (Idealista, Imovirtual), qualificação de clientes e follow-up sempre que alguém manifesta interesse num imóvel.

O resultado típico é um aumento de 40% na taxa de resposta com zero trabalho manual adicional.

Posso fazer uma análise rápida e grátis de como isto funcionaria para a {company}?

Cumprimentos,
Gabriel Correia
Pulso Digital"""
    }
}

# ─── Follow-up Templates ─────────────────────────────────────────────────────

FOLLOWUP_TEMPLATES = {
    1: {
        "subject": "Re: {original_subject}",
        "body": """Olá,

Enviei-lhe uma mensagem há alguns dias sobre como a AI pode automatizar processos na {company}.

Sei que é fácil perder emails no meio de tudo, por isso queria reforçar: ofereço uma análise gratuita e sem compromisso. Leva 10 minutos e identifica exactamente onde pode poupar tempo.

Tem interesse?

Cumprimentos,
Gabriel Correia
Pulso Digital"""
    },
    2: {
        "subject": "Último contacto — {company} + AI automation",
        "body": """Olá,

Este é o meu último email sobre o tema. Queria apenas deixar a porta aberta: se em algum momento a {company} quiser explorar automação com AI para poupar tempo e custos, estou disponível.

Pode responder a este email a qualquer altura ou visitar pulsodigital.pro para saber mais.

Bom trabalho!

Gabriel Correia
Pulso Digital"""
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
        json.dump(log, f, indent=2, ensure_ascii=False)

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
    msg["From"] = f"Gabriel Correia <{EMAIL_ADDRESS}>"
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

# ─── Follow-up System ────────────────────────────────────────────────────────

def run_followups(dry_run: bool = False):
    """Send follow-up emails to leads who haven't replied"""
    sent_log = load_sent_log()
    now = datetime.now()
    
    followup_1_sent = 0
    followup_2_sent = 0
    skipped = 0
    
    print(f"📋 Checking {len(sent_log)} contacted leads for follow-ups...\n")
    
    for email_addr, data in list(sent_log.items()):
        name = data.get("name", "Unknown")
        sent_at = datetime.fromisoformat(data["sent_at"])
        days_since = (now - sent_at).days
        followup_count = data.get("followup_count", 0)
        status = data.get("status", "sent")
        
        # Skip if replied
        if status == "replied":
            print(f"  ⏭️  Skip (replied): {name}")
            skipped += 1
            continue
        
        # Follow-up 1: after 3 days
        if followup_count == 0 and days_since >= 3:
            tmpl = FOLLOWUP_TEMPLATES[1]
            original_subject = data.get("original_subject", f"Automatização AI para {name}")
            subject = tmpl["subject"].format(original_subject=original_subject, company=name)
            body = tmpl["body"].format(company=name)
            
            print(f"  📤 Follow-up #1 to: {name} <{email_addr}> (sent {days_since} days ago)")
            success = send_email(email_addr, subject, body, dry_run=dry_run)
            
            if success:
                sent_log[email_addr]["followup_count"] = 1
                sent_log[email_addr]["followup_1_at"] = now.isoformat()
                followup_1_sent += 1
                print(f"     ✅ Follow-up #1 sent")
                if not dry_run:
                    time.sleep(3)
        
        # Follow-up 2: after 7 days (and followup 1 was sent)
        elif followup_count == 1:
            fu1_at = datetime.fromisoformat(data.get("followup_1_at", data["sent_at"]))
            days_since_fu1 = (now - fu1_at).days
            
            if days_since_fu1 >= 4:
                tmpl = FOLLOWUP_TEMPLATES[2]
                subject = tmpl["subject"].format(company=name)
                body = tmpl["body"].format(company=name)
                
                print(f"  📤 Follow-up #2 (final) to: {name} <{email_addr}>")
                success = send_email(email_addr, subject, body, dry_run=dry_run)
                
                if success:
                    sent_log[email_addr]["followup_count"] = 2
                    sent_log[email_addr]["followup_2_at"] = now.isoformat()
                    sent_log[email_addr]["status"] = "completed"
                    followup_2_sent += 1
                    print(f"     ✅ Follow-up #2 (final) sent")
                    if not dry_run:
                        time.sleep(3)
        
        elif followup_count >= 2:
            skipped += 1
        else:
            print(f"  ⏳ Too soon for {name} ({days_since} days since initial)")
    
    save_sent_log(sent_log)
    print(f"\n📊 Follow-up summary:")
    print(f"   Follow-up #1 sent: {followup_1_sent}")
    print(f"   Follow-up #2 sent: {followup_2_sent}")
    print(f"   Skipped: {skipped}")

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

        email_addr = lead.get("email", "").strip()
        name = lead.get("name", "Unknown").strip()
        category = lead.get("category", "negócio").strip()

        if not email_addr:
            skipped += 1
            continue

        if email_addr in sent_log:
            print(f"  ⏭️  Skip (already contacted): {name} <{email_addr}>")
            skipped += 1
            continue

        subject = tmpl["subject"].format(company=name, hours=hours, category=category)
        body = tmpl["body"].format(company=name, hours=hours, category=category)

        print(f"  📤 Sending to: {name} <{email_addr}>")
        success = send_email(email_addr, subject, body, dry_run=dry_run)

        if success:
            sent_log[email_addr] = {
                "name": name, "sent_at": datetime.now().isoformat(),
                "template": template, "status": "sent",
                "original_subject": subject, "followup_count": 0
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
    parser = argparse.ArgumentParser(description="Email outreach automation v2")
    parser.add_argument("--csv", help="Path to leads CSV")
    parser.add_argument("--template", default="default", choices=TEMPLATES.keys())
    parser.add_argument("--limit", type=int, default=20, help="Max emails to send")
    parser.add_argument("--hours", default="15", help="Hours saved (for template)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--follow-up", action="store_true", help="Send follow-up emails")
    args = parser.parse_args()

    if args.follow_up:
        run_followups(dry_run=args.dry_run)
    elif args.csv:
        run_outreach(args.csv, args.template, args.limit, args.hours, args.dry_run)
    else:
        print("❌ Specify --csv <file> or --follow-up")
        parser.print_help()
