# FreelanceBusiness — Instruções para AI

## Contexto do Projeto

Este workspace é para construir múltiplas fontes de rendimento usando AI.
**Lê SEMPRE `CONTEXT.md` antes de começar qualquer tarefa** — contém o plano completo, decisões tomadas e preferências do utilizador.

## Quem é o Utilizador

- Expert em usar AI, não programador tradicional
- Prefere comunicar por WhatsApp/email (sem chamadas)
- Trabalha com múltiplos chats em paralelo para aumentar velocity
- Tem PC com acesso remoto configurado via Chrome Remote Desktop

## Regras Deste Projecto

1. **APIs**: sempre em Node.js + Express, com API key auth via `x-api-key` header, endpoint `/health`
2. **Deploy**: Railway.app (grátis) → RapidAPI para distribuição
3. **Agency outreach**: usar `agency/scraper.py` + `agency/outreach.py`, máx 20-30 emails/dia
4. **Pricing APIs**: Free 100 req/mês, Basic $9, Pro $29, Enterprise $99
5. **Chrome Extensions**: Manifest v3, freemium (grátis + Pro pago)
6. **Tracking**: actualizar sempre `ideas/IDEAS_PIPELINE.md` quando algo é construído/publicado

## Workflows Disponíveis

- `/deploy-api` → Build e deploy de nova API
- `/agency-outreach` → Geração de leads e envio de emails
- `/publish-extension` → Build e publicação de Chrome Extension

## Próximas Prioridades (por ordem)

1. Publicar as 3 APIs já construídas no Railway + RapidAPI
2. Construir mais 5-10 APIs (ver lista em `ideas/IDEAS_PIPELINE.md`)
3. Correr scraper de leads para Lisboa/Porto
4. Enviar primeiros emails de outreach (template `agency`)
5. Construir primeira Chrome Extension (AI Page Summary)
