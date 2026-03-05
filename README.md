# 💼 FreelanceBusiness

Sistema completo para gerir todas as fontes de rendimento com AI.

## Estrutura

```
FreelanceBusiness/
├── apis/
│   ├── screenshot-api/    ← URL → PNG screenshot
│   ├── qr-api/            ← Gera QR codes
│   └── email-validator-api/ ← Valida emails
├── agency/
│   ├── scraper.py         ← Encontra leads no Google Maps
│   ├── outreach.py        ← Envia emails automaticamente
│   └── leads/             ← CSVs com contactos
├── extensions/            ← Chrome extensions (em breve)
├── ideas/
│   └── IDEAS_PIPELINE.md  ← Tracker de todas as ideias
└── .env.example           ← Configuração
```

## Setup Rápido

```bash
# 1. Copiar configuração
copy .env.example .env
# Editar .env com os teus emails e keys

# 2. APIs — instalar e correr
cd apis/screenshot-api && npm install && npm start
cd apis/qr-api && npm install && npm start
cd apis/email-validator-api && npm install && npm start

# 3. Agency — encontrar leads
pip install requests python-dotenv
python agency/scraper.py --query "agencias marketing Lisboa" --limit 50 --enrich-emails

# 4. Agency — enviar emails (testar primeiro)
python agency/outreach.py --csv agency/leads/leads_xxx.csv --dry-run
python agency/outreach.py --csv agency/leads/leads_xxx.csv --limit 20
```

## Deploy APIs (Grátis)

1. Cria conta em [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Seleciona a pasta da API
4. Adiciona variável `API_KEY` nas settings
5. **URL pública gerada automaticamente**

## Publicar no RapidAPI

1. Criar conta em [rapidapi.com/provider](https://rapidapi.com/provider)
2. "Add New API"
3. Nome, descrição, URL do Railway
4. Adicionar endpoints manualmente
5. Definir preços (free tier + paid)

## Ideas Tracker

Ver: [ideas/IDEAS_PIPELINE.md](ideas/IDEAS_PIPELINE.md)
