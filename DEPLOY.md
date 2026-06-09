# Deploy — Sisprime Web (Cloudflare Pages)

Mesmo modelo da pavcob-web: **Cloudflare Pages** + `@cloudflare/next-on-pages` (edge) + login JWT.
A app já está pronta (edge runtime, auth, build OK). Falta o que depende das suas contas.

## Pré-requisitos
- Conta **GitHub** (gratuita) — https://github.com/signup
- Conta **Cloudflare** (gratuita) — https://dash.cloudflare.com/sign-up

---

## 1) Subir o código pro GitHub
No diretório do projeto (já é um repo git, branch `main`, com 1 commit):

```bash
# crie um repositório PRIVADO em github.com/new  (ex.: sisprime-web) — NÃO inicialize com README
git remote add origin https://github.com/SEU_USUARIO/sisprime-web.git
git push -u origin main
```
(Se pedir login, use o GitHub CLI `gh auth login`, ou um Personal Access Token como senha.)

> Importante: o `.env.local` **não** vai pro GitHub (está no `.gitignore`). As senhas/segredo ficam só nas env vars do Cloudflare (passo 4).

## 2) Gerar os usuários de produção
```bash
node scripts/auth-bootstrap.mjs "vitor.cassimiro:SENHA_FORTE" "bruna:OUTRA_SENHA"
```
Copie as duas linhas geradas (`AUTH_JWT_SECRET=...` e `AUTH_USERS_JSON=...`) — vão no passo 4.
(Pode passar quantos `login:senha` quiser, separados por espaço.)

## 3) Criar o projeto no Cloudflare Pages
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorize o GitHub e selecione o repositório `sisprime-web`.
3. **Build settings**:
   - Framework preset: **Next.js**
   - Build command: `npx @cloudflare/next-on-pages@1`
   - Build output directory: `.vercel/output/static`
4. **Settings → Functions → Compatibility flags**: adicione **`nodejs_compat`** (em Production e Preview).
   - Compatibility date: deixe a sugerida (ou `2024-09-23` ou mais recente).

## 4) Variáveis de ambiente (Settings → Environment variables → Production)
```
METABASE_URL=https://metabase.debt.com.br
METABASE_API_KEY=mb_...            (a mesma key do .env.local)
METABASE_DATABASE_ID_CPJ=7
AUTH_JWT_SECRET=...                (gerado no passo 2)
AUTH_USERS_JSON=[...]              (gerado no passo 2)
```
(Recomendado replicar também no ambiente **Preview**.)

## 5) Deploy
- Salvar dispara o primeiro build. A cada `git push` na `main`, o Cloudflare rebuilda e publica.
- URL final: `https://sisprime-web.pages.dev` (ou domínio próprio em Custom domains).

---

## Atualizar os dados (propostas / contabilizações)
Os dados de propostas e contabilizações são **snapshots locais** (a rede da intranet
não é acessível pelo Cloudflare). Para atualizar (ex.: novo mês), **de dentro da rede**:

```bash
npm run load:contabilizacoes   # relê \\Srvad02...\CONTABILIZACOES
npm run load:propostas         # relê \\Srvad02...\PROPOSTAS
git add src/data && git commit -m "snapshot dados" && git push
```
O push aciona o redeploy automático.

> Processos (CPJ) são **ao vivo** via Metabase — não precisam de snapshot.

## Testar local antes do deploy
```bash
npm run dev        # http://localhost:3000  (login: admin / sisprime2026 — troque!)
npm run build      # valida o build de produção (edge)
```
