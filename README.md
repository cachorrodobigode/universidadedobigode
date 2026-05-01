# Universidade do Bigode

Plataforma de treinamento gamificado da rede **Cachorro do Bigode**.

- 🌭 Acesso por CPF
- 🐾 Trilha de aprendizado por cargo (cumulativa: Atendente → Cozinha → Monitor → Líder → Supervisor → Gerente)
- 🪙 Bigocoins como recompensa
- 🏆 Ranking nacional / por loja / por cargo
- 🎁 Loja de brindes com cupons validados pelo gerente

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend + Backend | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Banco / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| Hospedagem | Vercel (Hobby tier) |
| Vídeos | YouTube unlisted + watermark com CPF |
| PDFs | Supabase Storage + PDF.js viewer com watermark |

## Documentação

- 👉 **[`docs/SETUP_DEBORAH.md`](docs/SETUP_DEBORAH.md)** — guia passo-a-passo para a gestora criar contas e publicar o app (sem código)
- 📐 **[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)** — referência rápida de hierarquia, fluxos e segurança

## Rodar localmente

### Pré-requisitos
- Node.js 20+ (LTS)
- Conta no Supabase (free tier)

### Setup

```bash
npm install
cp .env.local.example .env.local
# preencha .env.local com as chaves do Supabase

# No Dashboard Supabase → SQL Editor, rode na ordem:
#   supabase/migrations/0001_schema.sql
#   supabase/migrations/0002_rls_policies.sql
#   supabase/seed/0001_cargos_default.sql

npm run dev
```

App em http://localhost:3000.

### Testes de RLS

```bash
supabase test db
```

## Estrutura

```
src/
├── app/
│   ├── (auth)/                 Login + primeiro-acesso
│   ├── (colaborador)/          Trilha, ranking, brindes, perfil
│   └── admin/                  Painéis master e gerente
├── components/                 UI compartilhada
├── lib/
│   ├── auth/                   CPF↔email, hierarquia, sessão
│   ├── supabase/               Clientes server/client/admin
│   ├── types/                  Tipos do banco
│   └── utils/                  Helpers
└── middleware.ts               Auth + redirects de rota

supabase/
├── migrations/
│   ├── 0001_schema.sql         Tabelas + funções de negócio
│   └── 0002_rls_policies.sql   Row Level Security
├── seed/                       Dados iniciais
└── tests/                      Testes pgTAP
```

## Princípios de segurança

1. **RLS em todas as tabelas** — qualquer query do cliente é filtrada pelo Postgres.
2. **CPF apenas em dígitos**, nunca em URL ou logs.
3. **Senha inicial = CPF**, troca obrigatória no primeiro login.
4. **`quiz_alternativas` bloqueada pra select direto** — colaborador acessa via `fn_quiz_para_responder` (sem revelar resposta certa).
5. **Resgate de Bigocoins atômico** (`SELECT FOR UPDATE`).
6. **Watermark com CPF** em vídeo e PDF — não impede vazamento, identifica o vazador (LGPD).
