# Arquitetura — referência rápida

Doc complementar ao README. Detalhes que devs/futuros mantenedores vão precisar.

## Hierarquia de cargos

```
nivel  cargo        vê
0      Atendente    seus + preparativo Cozinha
1      Cozinha      seus + preparativo Monitor
2      Monitor      ≤2 + preparativo Líder
3      Líder        ≤3 + preparativo Supervisor
4      Supervisor   ≤4 + preparativo Gerente
5      Gerente      ≤5 (tudo operacional)
99     Master       tudo + admin
```

Implementação: `public.fn_meu_nivel()` lê `cargos.nivel` do usuário corrente. RLS de `modulos`:

```
nivel_minimo <= meu_nivel
OR (nivel_minimo = meu_nivel + 1 AND is_preparativo)
```

## Fluxo de auth

1. Usuário digita CPF + senha em `/login`.
2. Server action converte CPF → `<cpf>@cdb.app` e chama `supabase.auth.signInWithPassword`.
3. Middleware verifica `primeiro_login`: se true, redireciona pra `/primeiro-acesso`.
4. Após troca, `primeiro_login = false` e libera `/trilha`.

## Fluxo de quiz (sem revelar resposta certa)

1. Cliente chama RPC `fn_quiz_para_responder(modulo_id)` — devolve perguntas + alternativas SEM o campo `correta`.
2. Usuário responde.
3. Cliente chama RPC `fn_responder_quiz(modulo_id, respostas[])` — Postgres calcula nota, atualiza `progresso`, credita Bigocoins se passou (idempotente).

A tabela `quiz_alternativas` está bloqueada pra select direto (RLS só permite `is_master`), então mesmo via DevTools o colaborador não enxerga as respostas certas.

## Fluxo de Bigocoins (atômico)

`fn_resgatar_brinde(brinde_id)` é `security definer` e faz:

1. `SELECT FOR UPDATE` no brinde → trava a linha.
2. Lê o saldo do extrato (append-only).
3. Se saldo suficiente: decrementa estoque, insere `resgates`, insere extrato negativo.

Tudo na mesma transação. Duplo clique não gera saldo negativo.

## Watermark

- **Vídeos**: overlay CSS por cima do iframe YouTube (`<div className="video-watermark">{cpf} {nome}</div>`). Dissuade screen capture; não bloqueia print.
- **PDFs**: renderizado dentro do canvas do PDF.js (a implementar na Fase 2).

## Variáveis de ambiente

| Var | Onde usar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server (limitado por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — admin client (criar usuário, resetar senha) |
| `INTERNAL_AUTH_DOMAIN` | server — domínio fake do email interno (default `cdb.app`) |
| `NEXT_PUBLIC_APP_URL` | URL pública (usado em emails futuros) |
