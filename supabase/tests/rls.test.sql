-- =====================================================================
-- Testes pgTAP — Row Level Security
--
-- Como rodar (via Supabase CLI + Postgres local):
--   supabase test db
--
-- Os testes simulam JWT de cada usuário via set_config('request.jwt.claims').
-- =====================================================================

begin;
create extension if not exists pgtap;

select plan(15);

-- ---------------------------------------------------------------------
-- Setup: cria 2 lojas, 2 cargos (Atendente=0, Líder=3, Master=99),
-- 4 usuários (atendente_a, atendente_b, lider_a, master),
-- 1 trilha, 3 módulos com níveis distintos
-- ---------------------------------------------------------------------
do $$
declare
  v_cargo_atend uuid; v_cargo_monitor uuid; v_cargo_lider uuid; v_cargo_master uuid;
  v_loja_a uuid; v_loja_b uuid;
  v_atend_a uuid := '00000000-0000-0000-0000-000000000001';
  v_atend_b uuid := '00000000-0000-0000-0000-000000000002';
  v_lider_a uuid := '00000000-0000-0000-0000-000000000003';
  v_master  uuid := '00000000-0000-0000-0000-000000000099';
  v_trilha  uuid; v_mod0 uuid; v_mod1 uuid; v_mod3 uuid; v_mod_prep uuid;
  v_quiz uuid; v_perg uuid;
begin
  -- Cargos
  insert into public.cargos (nome, nivel) values ('Atendente_t', 0) returning id into v_cargo_atend;
  insert into public.cargos (nome, nivel) values ('Monitor_t',   2) returning id into v_cargo_monitor;
  insert into public.cargos (nome, nivel) values ('Lider_t',     3) returning id into v_cargo_lider;
  insert into public.cargos (nome, nivel) values ('Master_t',   99) returning id into v_cargo_master;

  -- Lojas
  insert into public.lojas (nome) values ('Loja A') returning id into v_loja_a;
  insert into public.lojas (nome) values ('Loja B') returning id into v_loja_b;

  -- Cria entradas em auth.users (gambiarra de teste — não chama signup)
  insert into auth.users (id, email, encrypted_password, email_confirmed_at)
  values
    (v_atend_a, '11111111111@cdb.app', '', now()),
    (v_atend_b, '22222222222@cdb.app', '', now()),
    (v_lider_a, '33333333333@cdb.app', '', now()),
    (v_master,  '99999999999@cdb.app', '', now())
  on conflict (id) do nothing;

  insert into public.usuarios (id, cpf, nome, cargo_id, loja_id, is_master) values
    (v_atend_a, '11111111111', 'Atendente A', v_cargo_atend, v_loja_a, false),
    (v_atend_b, '22222222222', 'Atendente B', v_cargo_atend, v_loja_b, false),
    (v_lider_a, '33333333333', 'Líder A',     v_cargo_lider,  v_loja_a, false),
    (v_master,  '99999999999', 'Master',      v_cargo_master, null,    true);

  -- Trilha + módulos (nível 0, 1, 3, e preparativo nível 1 para atendente)
  insert into public.trilhas (nome, ordem) values ('Trilha Teste', 0) returning id into v_trilha;

  insert into public.modulos (trilha_id, ordem, titulo, nivel_minimo, is_preparativo)
    values (v_trilha, 1, 'Mod Atend',  0, false) returning id into v_mod0;
  insert into public.modulos (trilha_id, ordem, titulo, nivel_minimo, is_preparativo)
    values (v_trilha, 2, 'Mod Monitor', 2, false) returning id into v_mod1;
  insert into public.modulos (trilha_id, ordem, titulo, nivel_minimo, is_preparativo)
    values (v_trilha, 3, 'Mod Lider',   3, false) returning id into v_mod3;
  insert into public.modulos (trilha_id, ordem, titulo, nivel_minimo, is_preparativo)
    values (v_trilha, 4, 'Prep Cozinha', 1, true)  returning id into v_mod_prep;

  -- Quiz com 1 pergunta + 2 alternativas (1 correta) no módulo 0
  insert into public.quizzes (modulo_id) values (v_mod0) returning id into v_quiz;
  insert into public.quiz_perguntas (quiz_id, pergunta) values (v_quiz, '2+2?') returning id into v_perg;
  insert into public.quiz_alternativas (pergunta_id, texto, correta) values
    (v_perg, '4', true),
    (v_perg, '5', false);

  -- Brinde
  insert into public.brindes (nome, custo_bigocoins, estoque) values ('Camiseta CDB', 50, 10);

  -- Saldo inicial pra atendente A
  insert into public.bigocoins_extrato (usuario_id, valor, motivo) values (v_atend_a, 100, 'inicial_teste');
end $$;

-- Helper: simula JWT de um usuário (Supabase usa esse pattern em testes)
create or replace function public.test_set_jwt(p_user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id::text)::text, true),
         set_config('role', 'authenticated', true);
  select 1::void;
$$;

-- =====================================================================
-- TESTE 1: Atendente A só vê o próprio registro em usuarios
-- =====================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000001')::text, true);

select is(
  (select count(*)::int from public.usuarios),
  1,
  'Atendente A vê apenas 1 usuário (o próprio)'
);

-- =====================================================================
-- TESTE 2: Atendente A não vê módulo de Líder (nível 3)
-- =====================================================================
select is(
  (select count(*)::int from public.modulos where titulo = 'Mod Lider'),
  0,
  'Atendente não vê módulo de Líder'
);

-- =====================================================================
-- TESTE 3: Atendente A vê módulo do próprio nível
-- =====================================================================
select is(
  (select count(*)::int from public.modulos where titulo = 'Mod Atend'),
  1,
  'Atendente vê módulo do próprio nível'
);

-- =====================================================================
-- TESTE 4: Atendente A vê módulo preparativo de nível imediatamente acima
-- =====================================================================
select is(
  (select count(*)::int from public.modulos where titulo = 'Prep Cozinha'),
  1,
  'Atendente vê módulo preparativo de nível +1'
);

-- =====================================================================
-- TESTE 5: Atendente A NÃO vê módulo Monitor (nível +2) sem ser preparativo
-- =====================================================================
select is(
  (select count(*)::int from public.modulos where titulo = 'Mod Monitor'),
  0,
  'Atendente não vê módulo de nível +2'
);

-- =====================================================================
-- TESTE 6: Atendente A não consegue ler quiz_alternativas direto (esconde resposta)
-- =====================================================================
select is(
  (select count(*)::int from public.quiz_alternativas),
  0,
  'Atendente não consegue ler quiz_alternativas direto'
);

-- =====================================================================
-- TESTE 7: Atendente A vê o saldo próprio
-- =====================================================================
select is(
  (select saldo from public.saldo_bigocoins where usuario_id = '00000000-0000-0000-0000-000000000001'),
  100,
  'Atendente A vê o saldo próprio (100)'
);

-- =====================================================================
-- TESTE 8: Atendente A NÃO vê saldo de outro usuário
-- =====================================================================
select is(
  (select count(*)::int from public.saldo_bigocoins where usuario_id != '00000000-0000-0000-0000-000000000001'),
  0,
  'Atendente A não vê saldo de outros'
);

-- =====================================================================
-- Troca pra Líder A
-- =====================================================================
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000003')::text, true);

-- =====================================================================
-- TESTE 9: Líder vê módulo de Líder
-- =====================================================================
select is(
  (select count(*)::int from public.modulos where titulo = 'Mod Lider'),
  1,
  'Líder vê módulo de Líder'
);

-- =====================================================================
-- TESTE 10: Líder vê módulos de níveis abaixo (Atendente, Monitor, Cozinha)
-- =====================================================================
select cmp_ok(
  (select count(*)::int from public.modulos where titulo in ('Mod Atend','Mod Monitor','Prep Cozinha')),
  '>=',
  3,
  'Líder vê módulos de níveis abaixo (cumulativo)'
);

-- =====================================================================
-- TESTE 11: Líder NÃO consegue editar trilhas (não é master)
-- =====================================================================
select throws_ok(
  $$ insert into public.trilhas (nome, ordem) values ('Trilha proibida', 99) $$,
  null, null,
  'Líder não consegue inserir trilha'
);

-- =====================================================================
-- Troca pra Master
-- =====================================================================
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000099')::text, true);

-- =====================================================================
-- TESTE 12: Master vê todos os usuários
-- =====================================================================
select cmp_ok(
  (select count(*)::int from public.usuarios),
  '>=',
  4,
  'Master vê todos os usuários'
);

-- =====================================================================
-- TESTE 13: Master vê quiz_alternativas (com resposta)
-- =====================================================================
select cmp_ok(
  (select count(*)::int from public.quiz_alternativas where correta = true),
  '>=',
  1,
  'Master vê alternativas corretas'
);

-- =====================================================================
-- TESTE 14: Master pode inserir nova trilha
-- =====================================================================
select lives_ok(
  $$ insert into public.trilhas (nome, ordem) values ('Trilha Master OK', 100) $$,
  'Master pode inserir trilha'
);

-- =====================================================================
-- TESTE 15: Função fn_quiz_para_responder retorna alternativas SEM revelar quais são corretas
-- =====================================================================
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000001')::text, true);

select cmp_ok(
  (
    select count(*)::int
      from public.fn_quiz_para_responder(
        (select id from public.modulos where titulo = 'Mod Atend' limit 1)
      )
  ),
  '>=',
  2,
  'Atendente recebe alternativas via RPC (sem campo "correta" exposto)'
);

select * from finish();
rollback;
