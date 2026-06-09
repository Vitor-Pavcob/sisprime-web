# sisprime-web

Painel jurídico da **Sisprime do Brasil** — carteira e processos do contencioso.
Mesmo estilo/arquitetura do `pavcob-web`, com tema **azul institucional** Sisprime.

## Stack

Next.js 15 (App Router/RSC) · React 19 · Tailwind 3.4 · Recharts · TypeScript.
Dados via Metabase API (`src/lib/metabase.ts`).

## Fontes de dados

| Domínio | Fonte | Como filtra Sisprime |
|---|---|---|
| **Processos** ✅ | CPJ Amaral (Metabase db=7, MySQL) — `cad_processo` | `grupo_trabalho IN (10, 21)` |
| **Carteira** (Pipedrive) | _2ª fase_ | a definir (ver `memory/metabase-data-sources`) |

Grupos de trabalho Sisprime no CPJ:
- `10` → **SISPRIME — AÇÕES ATIVAS** (~2.411 processos · R$ 560,6 mi)
- `21` → **SISPRIME — AÇÕES PASSIVAS** (~396 processos · R$ 1,09 bi)

Todas as queries usam `incidente = 0` (capa do processo, sem incidentes/apensos).

## Telas

- `/visao-geral` — KPIs (processos, ativas/passivas, valor de causa, devedores, avalistas),
  composição da carteira, evolução por ano, distribuição por fase, por tipo de ação,
  por comarca e maiores processos por valor.

## Setup

```bash
npm install
cp .env.local.example .env.local   # preencha METABASE_URL, METABASE_API_KEY, METABASE_DATABASE_ID_CPJ
npm run dev
```

Abre em http://localhost:3000 (redireciona para `/visao-geral`).
