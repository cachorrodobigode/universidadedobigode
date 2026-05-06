# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Universidade do Bigode

Plataforma de treinamento gamificado da rede **Cachorro do Bigode** (food service). The user-facing brand is "Universidade do Bigode"; the repo and internal identifiers still use `app-trilha-cdb` / `trilha`. Do not rename internal identifiers without coordination — they're in routes, types, and migration filenames.

The primary user is **Deborah**, the gestora master, who is **non-technical** and runs the admin panel daily. Admin UIs must be defensive (confirmations on destructive actions, friendly Portuguese error messages, no jargon). All user-facing copy is in **Brazilian Portuguese**.

> **Estado atual:** este doc descreve a fundação. O projeto já evoluiu além da Fase 1 — ver `supabase/migrations/` (até `0010_*` no momento) e `git log` para o estado real (multi-loja, ranking, perfil, brindes com imagem, cargos franqueado/franqueadora, etc.).

## Next.js 16 — read AGENTS.md first

This is **Next.js 16** (App Router) with **React 19** and **Tailwind v4**. APIs differ from older Next.js. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` before assuming conventions.

Notable in this repo:
- `cookies()`, `headers()`, params on dynamic routes are async (must `await`)
- Server actions use `useActionState` (not `useFormState`)
- `globals.css` uses `@import "tailwindcss"` and `@theme inline { ... }` (Tailwind v4 syntax)

## Commands

```bash
npm run dev         # Next.js dev server on :3000 (needs .env.local)
npm run build       # Production build
npm start           # Run production build
npm run lint        # ESLint

supabase test db    # Runs supabase/tests/*.sql via pgTAP (needs Supabase CLI + local Postgres)
```

There is no test runner for the JS/TS code yet. Database tests are pgTAP only.

## Architecture

### Stack
| Layer | Choice |
|---|---|
| Frontend + Backend | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| DB / Auth / Storage | Supabase (Postgres + Auth + Storage) — free tier |
| Hosting | Vercel Hobby |
| Vídeos | YouTube unlisted + watermark CSS overlay |
| PDFs | Supabase Storage + PDF.js (watermark on canvas) — Fase 2 |

### Auth via CPF (no email)
Users log in with **CPF** (11 digits) + senha. Supabase Auth requires email-shaped strings, so we synthesize an internal email `<cpf>@cdb.app` (`INTERNAL_AUTH_DOMAIN`). The user **never sees this email**. Conversion lives in `src/lib/auth/cpf-email.ts`.

`public.usuarios.id = auth.users.id` (1-to-1). RLS policies use `auth.uid()` directly.

### Cumulative role hierarchy
| nivel | cargo | sees |
|---|---|---|
| 0 | Atendente | own + preparativo Cozinha |
| 1 | Cozinha | own + preparativo Monitor |
| 2 | Monitor | ≤2 + preparativo Líder |
| 3 | Líder | ≤3 + preparativo Supervisor |
| 4 | Supervisor | ≤4 + preparativo Gerente |
| 5 | Gerente | ≤5 (full operational) |
| 99 | Master | everything (admin) |

(Cargos adicionais como Franqueado/Franqueadora foram adicionados em migrations posteriores — checar `supabase/seed/` e migrations 0006/0007 para a lista canônica.)

Visibility rule baked into the `modulos_select` RLS policy:
```
nivel_minimo <= meu_nivel
OR (nivel_minimo = meu_nivel + 1 AND is_preparativo)
```

Helper SQL functions: `fn_meu_nivel()`, `fn_sou_master()`, `fn_sou_gerente_ou_master()`, `fn_modulos_visiveis()`, `fn_meu_perfil_minimo()` (esta última é usada pelo middleware para evitar recursão de RLS).

### Critical security patterns

1. **RLS is mandatory** — every table in `public.*` has `enable row level security`. Migration `0002_rls_policies.sql` defines the base policies; migrations posteriores expandem. Don't add a table without a policy.

2. **`quiz_alternativas` is opaque to non-master.** RLS allows SELECT only when `fn_sou_master()`. Colaboradores fetch quiz content via the SECURITY DEFINER RPC `fn_quiz_para_responder(modulo_id)`, which omits the `correta` column. Quiz answers are validated server-side in `fn_responder_quiz(modulo_id, respostas jsonb)` — the client never sees which alternative is correct.

3. **Bigocoins resgate is atomic.** `fn_resgatar_brinde(brinde_id)` does `SELECT ... FOR UPDATE` on the brinde row, validates saldo, decrements stock, inserts resgate, and inserts negative extrato — all in one transaction. Don't replace with client-side balance math.

4. **Admin client is server-only.** `src/lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS. Use it only in:
   - Server actions for admin operations (creating users, resetting passwords)
   - Cases of RLS recursion (e.g., reading own `usuarios.cpf` during `primeiro-acesso/actions.ts`)
   Never import it from client components.

5. **Middleware reads perfil via RPC `fn_meu_perfil_minimo`** (security definer) to avoid RLS recursion when checking `primeiro_login`/`ativo`. Defined in `0003_perfil_minimo.sql`.

### Important file boundaries

- `src/middleware.ts` — runs on every request; redirects unauthenticated users to `/login`, forces `primeiro-acesso` flow, blocks inactive users. Don't add heavy logic here — it runs on every navigation.
- `src/lib/auth/getUsuarioAtual.ts` — server-side helper that joins `usuarios` + `cargos`. Use in layouts and server pages, not client components.
- `src/lib/supabase/server.ts` — request-scoped server client (uses cookies). Never cached across requests.
- `src/lib/supabase/client.ts` — browser client; safe to call from `"use client"` components.
- `src/app/(auth)/`, `src/app/(colaborador)/` — route groups, parens don't appear in URL.

### Where to look for things

| Topic | Path |
|---|---|
| DB schema + business RPCs | `supabase/migrations/0001_schema.sql` |
| RLS policies + quiz/resgate RPCs | `supabase/migrations/0002_rls_policies.sql` |
| Migrations posteriores (perfil, multi-loja, ranking, etc.) | `supabase/migrations/0003_*.sql` em diante |
| Default cargos seed | `supabase/seed/0001_cargos_default.sql` |
| RLS test cases | `supabase/tests/rls.test.sql` (pgTAP) |
| Visual tokens (cores CDB provisórias) | `src/app/globals.css` |
| Cargo helper TS | `src/lib/auth/cargo-hierarchy.ts` |
| Setup guide para Deborah | `docs/SETUP_DEBORAH.md` |
| Decisões arquiteturais | `docs/ARQUITETURA.md` |

## Conventions

- **Server actions over API routes** for form submissions. Use `useActionState` on the client.
- **Sonner** for toasts (already wired in root layout).
- **dnd-kit** for any drag-and-drop (don't add `react-beautiful-dnd`).
- **react-hook-form + zod + useFieldArray** for the quiz editor — the hairy nested form lives there.
- **TanStack Table v8** for admin tables.
- **shadcn/ui** is **not** initialized — current code uses raw Tailwind. If adding it, run `npx shadcn@latest init` and adapt the Tailwind v4 setup.
- All copy in **Portuguese (pt-BR)**.

## Things to flag, not silently do

- Renaming routes or DB columns (would break the migration chain and any deployed instance)
- Adding new tables without RLS policies in the same change
- Switching from Supabase Auth to a custom auth scheme
- Any change that could leak `quiz_alternativas.correta` to the client
- Loosening RLS to "fix" a query (the right fix is usually an RPC with `security definer`)
- Installing shadcn or other UI kits without confirming first — current style is intentional minimal Tailwind
