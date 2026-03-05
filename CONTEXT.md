# FreelanceBusiness — Contexto Completo do Projeto

## Quem Sou

Não sou programador tradicional — sou muito bom a usar AI para construir projectos. Esta é a minha vantagem competitiva: consigo construir em horas o que outros demoram semanas.

## Projectos em Paralelo

### 1. `d:/GC/Trading/autoliveultra` — Bot de Trading Crypto

- Bot de trading criado com Antigravity (AI assistant)
- Corre na Binance Futures com 600+ trades/day em paper trading
- Edge positivo de ~$0.077 por $1 invested
- Estratégias: MTF1h, TripleEMA, ML-based signals
- Status: em validação, próximo passo live trading

### 2. `d:/GC/freelancer-scanner` — Freelancer Auto-Scanner

- Scanner automático da Freelancer.com via API oficial
- Detecta novos projetos matching keywords/budget
- Gera propostas com AI e notifica via Telegram
- Modo: `notify` (aprovação manual antes de bidar)
- Status: construído, aguarda tokens de API

### 3. `d:/GC/FreelanceBusiness` — Este Projecto

- Múltiplas fontes de rendimento passivo/semi-passivo
- Ver secções abaixo

---

## Plano de Negócio — O Que Decidimos

### Estratégia Geral

Depois de pesquisa profunda de mercado, o plano optimizado é:

**Fase 1 (Agora — Mês 1-2): Cashflow Imediato**

- AI Automation Agency: contactar PMEs locais, automatizar processos
- Revenue alvo: $5-20k/mês com 2-4 clientes

**Fase 2 (Mês 2-4): Receita Passiva**

- APIs no RapidAPI: 20-30+ APIs simples publicadas
- Chrome Extensions: 10+ extensões na Chrome Web Store
- Revenue extra: $500-2k/mês crescendo

**Fase 3 (Mês 4-8): Produto SaaS**

- Transformar problema mais comum dos clientes de agency em Micro-SaaS
- Revenue alvo: $1-5k/mês recorrente

**Fase 4 (Mês 8-12+): Scale**

- Todas as fontes combinadas: $19-65k/mês realista

### Por Que AI Agency e Não Websites

Websites = custo para o cliente. Agency automation = investimento (poupa dinheiro).

- Uma automação típica poupa 15-20h/semana a uma PME
- Preço: $2.500-5.000 setup + $500-1.500/mês retainer
- Solo consultant chegou a $38.000/mês em 90 dias (caso real documentado)

### Preferências de Trabalho

- **Zero chamadas** — tudo por WhatsApp ou email (posso consultar a AI enquanto respondo)
- **Sem mostrar diplomas/certificados** — provar com resultado directo
- **Portfólio**: usar projectos já feitos (trading bot, scanner, etc.) como demonstração
- **100% assíncrono** — clientes preferem isto também

### Como Arranjar Clientes

1. **Free Audit Method**: analisar negócio de empresa e enviar relatório grátis com 3 processos automatizáveis + estimativa de horas poupadas
2. **LinkedIn Outreach**: 20-30 mensagens/dia a donos de PMEs
3. **Grupos Facebook/Telegram**: empreendedores Portugal
4. **Sistema automatizado**: `agency/scraper.py` + `agency/outreach.py` fazem tudo automaticamente

Template de email que funciona — ver `agency/outreach.py` → TEMPLATES dict.

### Primeiro Mês Realista

- Sem investimento: ~$0
- Com esforço (10h/dia): $350-1.500 combinando todas as fontes
- Mês 3: $1.500-5.000
- Mês 12: $10.000-26.000 (conservador)

---

## APIs Construídas

| API | Ficheiro | Status |
|---|---|---|
| Screenshot API | `apis/screenshot-api/` | ✅ Pronta |
| QR Code Generator | `apis/qr-api/` | ✅ Pronta + testada |
| Email Validator | `apis/email-validator-api/` | ✅ Pronta |

### Deploy (cada API)

```powershell
# Railway.app — grátis até 500h/mês
# 1. Criar conta railway.app
# 2. New Project → Deploy from GitHub
# 3. Seleccionar pasta da API
# 4. Adicionar variável API_KEY
# URL pública gerada automaticamente

# RapidAPI — publicar para developers encontrarem
# 1. rapidapi.com/provider → Add New API
# 2. Nome, descrição, URL do Railway
# 3. Adicionar endpoints + definir preços
```

### Pricing Strategy

```
Free:       100 req/mês   — para atrair users
Basic:      $9/mês        — 10.000 req/mês
Pro:        $29/mês       — 100.000 req/mês
Enterprise: $99/mês       — ilimitado
```

---

## Agency — Sistema de Outreach

### Scraper

```powershell
# Instalar dependências
pip install requests python-dotenv

# Correr (precisa de SERPAPI_KEY no .env — grátis 100 busquedas/mês)
python agency/scraper.py --query "agencias marketing Lisboa" --limit 50 --enrich-emails

# Sem API key cria template CSV para preenchimento manual
python agency/scraper.py --query "restaurantes Porto" --limit 20
```

### Outreach

```powershell
# Testar sem enviar (recomendado primeiro)
python agency/outreach.py --csv agency/leads/leads_xxx.csv --dry-run

# Enviar 20 emails
python agency/outreach.py --csv agency/leads/leads_xxx.csv --limit 20

# Templates disponíveis: default, restaurant, agency
python agency/outreach.py --csv agency/leads/leads_xxx.csv --template agency
```

### Setup Gmail para Envio

1. Ligar 2-Step verification na conta Google
2. Ir a: myaccount.google.com → Security → App passwords
3. Criar password para "Mail" → copiar para `.env` como `EMAIL_PASSWORD`

---

## Próximas APIs para Construir

Ver `ideas/IDEAS_PIPELINE.md` — lista completa com 15 APIs e 6 Chrome Extensions.

**Prioritárias:**

- URL Shortener + analytics
- Text Summarizer (usa AI via API)
- PDF Generator (HTML → PDF)
- Web Scraper (generic)
- IP Geolocation

---

## Nichos de AI Agency com Maior ROI

Baseado em pesquisa de mercado:

| Nicho | Problema | Preço | Concorrência |
|---|---|---|---|
| Legal | Review de contratos | $200-500/mês | Baixa |
| Saúde | Notas clínicas automatizadas | $100-300/mês/médico | Baixa |
| Imobiliário | Análise de propriedades | $50-200/mês | Média |
| Contabilidade | Reconciliação automática | $200-500/mês | Baixa |
| E-commerce | Optimização de listings | $30-100/mês | Média |

---

## Notas Importantes

- Os chats de Antigravity são separados por workspace — usar `d:/GC/FreelanceBusiness/` como workspace para chats relacionados com este projecto
- Posso ter múltiplos chats em paralelo para construir várias APIs ao mesmo tempo
- Acesso remoto ao PC via Chrome Remote Desktop já configurado (para trabalhar do telemóvel/tablet)
- O trading bot está em `d:/GC/Trading/autoliveultra` — projecto separado
