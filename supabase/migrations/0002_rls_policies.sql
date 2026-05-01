-- =====================================================================
-- 0002_rls_policies.sql
-- Row Level Security — TODAS as tabelas têm RLS ativada.
-- Funções helper (fn_meu_nivel, fn_sou_master, fn_sou_gerente_ou_master,
-- fn_modulos_visiveis) estão definidas em 0001_schema.sql.
--
-- Convenções:
-- - "own": auth.uid() = usuario_id da linha
-- - "master": fn_sou_master() = true
-- - "gerente_da_loja": fn_sou_gerente_ou_master() AND mesma loja_id
-- =====================================================================

-- ---------------------------------------------------------------------
-- Habilita RLS em todas as tabelas
-- ---------------------------------------------------------------------
alter table public.cargos             enable row level security;
alter table public.lojas              enable row level security;
alter table public.usuarios           enable row level security;
alter table public.trilhas            enable row level security;
alter table public.modulos            enable row level security;
alter table public.conteudos          enable row level security;
alter table public.quizzes            enable row level security;
alter table public.quiz_perguntas     enable row level security;
alter table public.quiz_alternativas  enable row level security;
alter table public.progresso          enable row level security;
alter table public.bigocoins_extrato  enable row level security;
alter table public.brindes            enable row level security;
alter table public.resgates           enable row level security;
alter table public.audit_log          enable row level security;

-- ---------------------------------------------------------------------
-- CARGOS: leitura por autenticados, escrita só master
-- ---------------------------------------------------------------------
drop policy if exists cargos_select   on public.cargos;
drop policy if exists cargos_modify   on public.cargos;
create policy cargos_select on public.cargos
  for select to authenticated using (true);
create policy cargos_modify on public.cargos
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- LOJAS: leitura por autenticados, escrita só master
-- ---------------------------------------------------------------------
drop policy if exists lojas_select on public.lojas;
drop policy if exists lojas_modify on public.lojas;
create policy lojas_select on public.lojas
  for select to authenticated using (true);
create policy lojas_modify on public.lojas
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- USUÁRIOS:
-- - SELECT: own | master | gerente da mesma loja
-- - INSERT: só via service role (admin client) — denied for authenticated
-- - UPDATE: own (campos limitados via app); master tudo; gerente sua loja
-- - DELETE: só master
-- ---------------------------------------------------------------------
drop policy if exists usuarios_select on public.usuarios;
drop policy if exists usuarios_update on public.usuarios;
drop policy if exists usuarios_delete on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated using (
    id = auth.uid()
    or public.fn_sou_master()
    or (
      public.fn_sou_gerente_ou_master()
      and loja_id = (select u.loja_id from public.usuarios u where u.id = auth.uid())
    )
  );
create policy usuarios_update on public.usuarios
  for update to authenticated using (
    id = auth.uid()
    or public.fn_sou_master()
    or (
      public.fn_sou_gerente_ou_master()
      and loja_id = (select u.loja_id from public.usuarios u where u.id = auth.uid())
    )
  ) with check (
    id = auth.uid()
    or public.fn_sou_master()
    or (
      public.fn_sou_gerente_ou_master()
      and loja_id = (select u.loja_id from public.usuarios u where u.id = auth.uid())
      -- gerente NÃO pode promover a master
      and is_master = false
    )
  );
create policy usuarios_delete on public.usuarios
  for delete to authenticated using (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- TRILHAS: leitura todos, escrita só master
-- ---------------------------------------------------------------------
drop policy if exists trilhas_select on public.trilhas;
drop policy if exists trilhas_modify on public.trilhas;
create policy trilhas_select on public.trilhas
  for select to authenticated using (ativa or public.fn_sou_master());
create policy trilhas_modify on public.trilhas
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- MÓDULOS: leitura filtrada por nível do colaborador
-- ---------------------------------------------------------------------
drop policy if exists modulos_select on public.modulos;
drop policy if exists modulos_modify on public.modulos;
create policy modulos_select on public.modulos
  for select to authenticated using (
    public.fn_sou_master()
    or (
      ativo
      and (
        nivel_minimo <= public.fn_meu_nivel()
        or (nivel_minimo = public.fn_meu_nivel() + 1 and is_preparativo)
      )
    )
  );
create policy modulos_modify on public.modulos
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- CONTEÚDOS: visíveis se o módulo é visível
-- ---------------------------------------------------------------------
drop policy if exists conteudos_select on public.conteudos;
drop policy if exists conteudos_modify on public.conteudos;
create policy conteudos_select on public.conteudos
  for select to authenticated using (
    public.fn_sou_master()
    or modulo_id in (select modulo_id from public.fn_modulos_visiveis())
  );
create policy conteudos_modify on public.conteudos
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- QUIZZES: visíveis se o módulo é visível
-- ---------------------------------------------------------------------
drop policy if exists quizzes_select on public.quizzes;
drop policy if exists quizzes_modify on public.quizzes;
create policy quizzes_select on public.quizzes
  for select to authenticated using (
    public.fn_sou_master()
    or modulo_id in (select modulo_id from public.fn_modulos_visiveis())
  );
create policy quizzes_modify on public.quizzes
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- QUIZ_PERGUNTAS: idem
-- ---------------------------------------------------------------------
drop policy if exists quiz_perguntas_select on public.quiz_perguntas;
drop policy if exists quiz_perguntas_modify on public.quiz_perguntas;
create policy quiz_perguntas_select on public.quiz_perguntas
  for select to authenticated using (
    public.fn_sou_master()
    or quiz_id in (
      select id from public.quizzes
       where modulo_id in (select modulo_id from public.fn_modulos_visiveis())
    )
  );
create policy quiz_perguntas_modify on public.quiz_perguntas
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- QUIZ_ALTERNATIVAS: APENAS master pode SELECT direto
-- (colaborador acessa via RPC fn_quiz_para_responder, que omite `correta`)
-- ---------------------------------------------------------------------
drop policy if exists quiz_alternativas_select on public.quiz_alternativas;
drop policy if exists quiz_alternativas_modify on public.quiz_alternativas;
create policy quiz_alternativas_select on public.quiz_alternativas
  for select to authenticated using (public.fn_sou_master());
create policy quiz_alternativas_modify on public.quiz_alternativas
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- PROGRESSO: own | master | gerente da loja
-- INSERT/UPDATE: only via fn_concluir_modulo (security definer)
-- ---------------------------------------------------------------------
drop policy if exists progresso_select on public.progresso;
drop policy if exists progresso_modify on public.progresso;
create policy progresso_select on public.progresso
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.fn_sou_master()
    or (
      public.fn_sou_gerente_ou_master()
      and usuario_id in (
        select id from public.usuarios
         where loja_id = (select u.loja_id from public.usuarios u where u.id = auth.uid())
      )
    )
  );
-- Bloqueia INSERT/UPDATE/DELETE direto (negação total via with check false)
create policy progresso_modify on public.progresso
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- BIGOCOINS_EXTRATO: own | master | gerente da loja (insert via funções)
-- ---------------------------------------------------------------------
drop policy if exists bigocoins_select on public.bigocoins_extrato;
drop policy if exists bigocoins_modify on public.bigocoins_extrato;
create policy bigocoins_select on public.bigocoins_extrato
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.fn_sou_master()
    or (
      public.fn_sou_gerente_ou_master()
      and usuario_id in (
        select id from public.usuarios
         where loja_id = (select u.loja_id from public.usuarios u where u.id = auth.uid())
      )
    )
  );
create policy bigocoins_modify on public.bigocoins_extrato
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- BRINDES: leitura por autenticados (vê catálogo); escrita só master
-- ---------------------------------------------------------------------
drop policy if exists brindes_select on public.brindes;
drop policy if exists brindes_modify on public.brindes;
create policy brindes_select on public.brindes
  for select to authenticated using (ativo or public.fn_sou_master());
create policy brindes_modify on public.brindes
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- RESGATES: own | master | gerente da loja (validação via RPC)
-- ---------------------------------------------------------------------
drop policy if exists resgates_select on public.resgates;
drop policy if exists resgates_modify on public.resgates;
create policy resgates_select on public.resgates
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.fn_sou_master()
    or (
      public.fn_sou_gerente_ou_master()
      and usuario_id in (
        select id from public.usuarios
         where loja_id = (select u.loja_id from public.usuarios u where u.id = auth.uid())
      )
    )
  );
create policy resgates_modify on public.resgates
  for all to authenticated using (public.fn_sou_master()) with check (public.fn_sou_master());

-- ---------------------------------------------------------------------
-- AUDIT_LOG: só master lê
-- ---------------------------------------------------------------------
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated using (public.fn_sou_master());

-- =====================================================================
-- RPC: quiz para responder (sem revelar `correta`)
-- =====================================================================
create or replace function public.fn_quiz_para_responder(p_modulo_id uuid)
returns table (
  pergunta_id   uuid,
  ordem_pergunta int,
  pergunta      text,
  alternativa_id uuid,
  ordem_alt     int,
  alternativa   text
) language sql stable security definer as $$
  select
    qp.id        as pergunta_id,
    qp.ordem     as ordem_pergunta,
    qp.pergunta,
    qa.id        as alternativa_id,
    qa.ordem     as ordem_alt,
    qa.texto     as alternativa
  from public.quizzes q
  join public.quiz_perguntas    qp on qp.quiz_id = q.id
  join public.quiz_alternativas qa on qa.pergunta_id = qp.id
  where q.modulo_id = p_modulo_id
    and (
      public.fn_sou_master()
      or p_modulo_id in (select modulo_id from public.fn_modulos_visiveis())
    )
  order by qp.ordem, qa.ordem;
$$;

-- =====================================================================
-- RPC: responder quiz e calcular nota (não revela alternativas corretas)
-- p_respostas: array de objetos {pergunta_id, alternativa_id}
-- =====================================================================
create or replace function public.fn_responder_quiz(
  p_modulo_id uuid,
  p_respostas jsonb
) returns table (
  total_perguntas    int,
  acertos            int,
  nota               int,
  passou             boolean,
  bigocoins_creditados int,
  saldo_apos         int
) language plpgsql security definer as $$
declare
  v_usuario_id uuid := auth.uid();
  v_quiz_id    uuid;
  v_nota_min   int;
  v_total      int;
  v_acertos    int;
  v_nota       int;
  v_passou     boolean;
  v_creditados int := 0;
  v_saldo      int;
begin
  if v_usuario_id is null then raise exception 'NAO_AUTENTICADO'; end if;

  select q.id, q.nota_minima into v_quiz_id, v_nota_min
    from public.quizzes q
   where q.modulo_id = p_modulo_id;
  if not found then raise exception 'QUIZ_NAO_ENCONTRADO'; end if;

  select count(*)::int into v_total
    from public.quiz_perguntas where quiz_id = v_quiz_id;

  -- conta acertos: pra cada resposta enviada, alternativa_id deve ser correta=true
  --                e pertencer à pergunta correta
  select count(*)::int into v_acertos
    from jsonb_array_elements(p_respostas) r
    join public.quiz_alternativas qa
      on qa.id = (r->>'alternativa_id')::uuid
     and qa.pergunta_id = (r->>'pergunta_id')::uuid
   where qa.correta = true
     and qa.pergunta_id in (select id from public.quiz_perguntas where quiz_id = v_quiz_id);

  v_nota   := case when v_total = 0 then 0 else round((v_acertos::numeric / v_total) * 100)::int end;
  v_passou := v_nota >= v_nota_min;

  -- Registra tentativa
  insert into public.progresso (usuario_id, modulo_id, status, nota_quiz, tentativas)
  values (
    v_usuario_id, p_modulo_id,
    case when v_passou then 'concluido'::public.status_modulo else 'disponivel'::public.status_modulo end,
    v_nota, 1
  )
  on conflict (usuario_id, modulo_id) do update
     set status = case when v_passou then 'concluido' else public.progresso.status end,
         nota_quiz = greatest(coalesce(public.progresso.nota_quiz, 0), v_nota),
         tentativas = public.progresso.tentativas + 1,
         concluido_em = case when v_passou and public.progresso.concluido_em is null then now() else public.progresso.concluido_em end;

  -- Credita bigocoins só na primeira vez que passa
  if v_passou and not exists (
    select 1 from public.bigocoins_extrato
     where usuario_id = v_usuario_id and modulo_id = p_modulo_id and motivo = 'modulo_concluido'
  ) then
    select recompensa_bigocoins into v_creditados from public.modulos where id = p_modulo_id;
    insert into public.bigocoins_extrato (usuario_id, valor, motivo, modulo_id)
    values (v_usuario_id, v_creditados, 'modulo_concluido', p_modulo_id);
  end if;

  select saldo into v_saldo from public.saldo_bigocoins where usuario_id = v_usuario_id;
  v_saldo := coalesce(v_saldo, 0);

  return query select v_total, v_acertos, v_nota, v_passou, v_creditados, v_saldo;
end;
$$;
