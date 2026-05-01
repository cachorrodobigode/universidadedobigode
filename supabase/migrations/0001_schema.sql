-- =====================================================================
-- 0001_schema.sql
-- Schema principal — App de Trilha de Treinamento Cachorro do Bigode
--
-- Decisões de arquitetura:
-- 1. Supabase Auth gerencia senha. CPF é convertido em email "<cpf>@cdb.app"
--    apenas internamente. O usuário só vê o CPF na tela de login.
-- 2. public.usuarios.id = auth.users.id (1-to-1) → RLS usa auth.uid() direto.
-- 3. CPF armazenado apenas em dígitos (sem máscara) com unique index.
-- 4. Funções de negócio críticas (resgate, conclusão de módulo) fazem lock
--    explícito (SELECT FOR UPDATE) para evitar race condition.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- ENUMS
-- =====================================================================
do $$ begin
  create type public.status_modulo  as enum ('bloqueado','disponivel','concluido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_conteudo  as enum ('video_youtube','pdf');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_resgate as enum ('pendente','validado','cancelado','expirado');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- CARGOS
-- =====================================================================
create table if not exists public.cargos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  nivel       int  not null,
  descricao   text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
comment on column public.cargos.nivel is
  'Hierarquia: 0=Atendente, 1=Cozinha, 2=Monitor, 3=Lider, 4=Supervisor, 5=Gerente, 99=Master';
create index if not exists cargos_nivel_idx on public.cargos(nivel);

-- =====================================================================
-- LOJAS
-- =====================================================================
create table if not exists public.lojas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  cidade    text,
  ativa     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- USUÁRIOS (1-to-1 com auth.users)
-- =====================================================================
create table if not exists public.usuarios (
  id             uuid primary key references auth.users(id) on delete cascade,
  cpf            text not null unique,
  nome           text not null,
  cargo_id       uuid not null references public.cargos(id) on delete restrict,
  loja_id        uuid references public.lojas(id) on delete set null,
  is_master      boolean not null default false,
  is_gerente     boolean not null default false,
  primeiro_login boolean not null default true,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint usuarios_cpf_so_digitos check (cpf ~ '^[0-9]{11}$')
);
comment on column public.usuarios.cpf is 'CPF apenas com dígitos, sem máscara';
create index if not exists usuarios_cargo_idx on public.usuarios(cargo_id);
create index if not exists usuarios_loja_idx  on public.usuarios(loja_id);

-- =====================================================================
-- TRILHAS
-- =====================================================================
create table if not exists public.trilhas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  descricao text,
  cargo_id  uuid references public.cargos(id) on delete set null,
  ordem     int not null default 0,
  ativa     boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists trilhas_cargo_idx on public.trilhas(cargo_id);

-- =====================================================================
-- MÓDULOS (etapas)
-- =====================================================================
create table if not exists public.modulos (
  id                   uuid primary key default gen_random_uuid(),
  trilha_id            uuid not null references public.trilhas(id) on delete cascade,
  ordem                int not null,
  titulo               text not null,
  descricao            text,
  recompensa_bigocoins int not null default 10 check (recompensa_bigocoins >= 0),
  nivel_minimo         int not null default 0,
  is_preparativo       boolean not null default false,
  ativo                boolean not null default true,
  criado_em            timestamptz not null default now()
);
create index if not exists modulos_trilha_ordem_idx on public.modulos(trilha_id, ordem);
create index if not exists modulos_nivel_idx        on public.modulos(nivel_minimo, is_preparativo);

-- =====================================================================
-- CONTEÚDOS (vídeo + PDF dentro do módulo)
-- =====================================================================
create table if not exists public.conteudos (
  id          uuid primary key default gen_random_uuid(),
  modulo_id   uuid not null references public.modulos(id) on delete cascade,
  ordem       int not null default 0,
  tipo        public.tipo_conteudo not null,
  url         text not null,
  titulo      text,
  duracao_seg int,
  criado_em   timestamptz not null default now()
);
create index if not exists conteudos_modulo_idx on public.conteudos(modulo_id, ordem);

-- =====================================================================
-- QUIZZES
-- =====================================================================
create table if not exists public.quizzes (
  id              uuid primary key default gen_random_uuid(),
  modulo_id       uuid not null references public.modulos(id) on delete cascade unique,
  nota_minima     int not null default 70 check (nota_minima between 0 and 100),
  permite_refazer boolean not null default true,
  criado_em       timestamptz not null default now()
);

create table if not exists public.quiz_perguntas (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references public.quizzes(id) on delete cascade,
  ordem      int not null default 0,
  pergunta   text not null,
  explicacao text,
  criado_em  timestamptz not null default now()
);
create index if not exists quiz_perguntas_quiz_idx on public.quiz_perguntas(quiz_id, ordem);

create table if not exists public.quiz_alternativas (
  id          uuid primary key default gen_random_uuid(),
  pergunta_id uuid not null references public.quiz_perguntas(id) on delete cascade,
  ordem       int not null default 0,
  texto       text not null,
  correta     boolean not null default false
);
create index if not exists quiz_alternativas_pergunta_idx on public.quiz_alternativas(pergunta_id, ordem);

-- =====================================================================
-- PROGRESSO
-- =====================================================================
create table if not exists public.progresso (
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  modulo_id       uuid not null references public.modulos(id) on delete cascade,
  status          public.status_modulo not null default 'disponivel',
  nota_quiz       int check (nota_quiz between 0 and 100),
  tentativas      int not null default 0,
  video_assistido boolean not null default false,
  iniciado_em     timestamptz not null default now(),
  concluido_em    timestamptz,
  primary key (usuario_id, modulo_id)
);
create index if not exists progresso_usuario_idx   on public.progresso(usuario_id);
create index if not exists progresso_concluido_idx on public.progresso(concluido_em desc) where status = 'concluido';

-- =====================================================================
-- BIGOCOINS — extrato (saldo é soma)
-- =====================================================================
create table if not exists public.bigocoins_extrato (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  valor      int not null,
  motivo     text not null,
  modulo_id  uuid references public.modulos(id) on delete set null,
  resgate_id uuid,
  criado_em  timestamptz not null default now()
);
create index if not exists bigocoins_usuario_idx on public.bigocoins_extrato(usuario_id, criado_em desc);

create or replace view public.saldo_bigocoins as
  select usuario_id, coalesce(sum(valor),0)::int as saldo
    from public.bigocoins_extrato
   group by usuario_id;

-- =====================================================================
-- BRINDES (catálogo)
-- =====================================================================
create table if not exists public.brindes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  descricao       text,
  custo_bigocoins int  not null check (custo_bigocoins > 0),
  estoque         int  not null default 0 check (estoque >= 0),
  foto_url        text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- =====================================================================
-- RESGATES (cupons)
-- =====================================================================
create table if not exists public.resgates (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  brinde_id    uuid not null references public.brindes(id) on delete restrict,
  codigo_unico text not null unique,
  status       public.status_resgate not null default 'pendente',
  custo        int not null,
  criado_em    timestamptz not null default now(),
  validado_em  timestamptz,
  validado_por uuid references public.usuarios(id),
  expira_em    timestamptz not null default (now() + interval '30 days')
);
create index if not exists resgates_usuario_idx on public.resgates(usuario_id, criado_em desc);
create index if not exists resgates_codigo_idx  on public.resgates(codigo_unico);
create index if not exists resgates_status_idx  on public.resgates(status);

-- =====================================================================
-- AUDIT LOG
-- =====================================================================
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid references public.usuarios(id) on delete set null,
  acao        text not null,
  entidade    text,
  entidade_id uuid,
  metadata    jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists audit_usuario_idx  on public.audit_log(usuario_id, criado_em desc);
create index if not exists audit_entidade_idx on public.audit_log(entidade, entidade_id);

-- =====================================================================
-- TRIGGERS
-- =====================================================================
create or replace function public.fn_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists usuarios_touch_updated_at on public.usuarios;
create trigger usuarios_touch_updated_at
  before update on public.usuarios
  for each row execute function public.fn_touch_updated_at();

-- =====================================================================
-- FUNÇÃO: nível de cargo do usuário corrente (helper para RLS)
-- =====================================================================
create or replace function public.fn_meu_nivel() returns int
language sql stable security definer as $$
  select c.nivel
    from public.usuarios u
    join public.cargos c on c.id = u.cargo_id
   where u.id = auth.uid()
     and u.ativo = true
   limit 1;
$$;

create or replace function public.fn_sou_master() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select is_master from public.usuarios where id = auth.uid() and ativo = true),
    false
  );
$$;

create or replace function public.fn_sou_gerente_ou_master() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select (is_master or is_gerente) from public.usuarios where id = auth.uid() and ativo = true),
    false
  );
$$;

-- =====================================================================
-- FUNÇÃO: módulos visíveis pro usuário corrente
-- Regra: nivel_minimo <= meu_nivel  OU  (nivel_minimo = meu_nivel + 1 AND is_preparativo)
-- =====================================================================
create or replace function public.fn_modulos_visiveis(p_usuario_id uuid default null)
returns table (modulo_id uuid)
language sql stable security definer as $$
  with me as (
    select c.nivel
      from public.usuarios u
      join public.cargos c on c.id = u.cargo_id
     where u.id = coalesce(p_usuario_id, auth.uid())
       and u.ativo = true
  )
  select m.id
    from public.modulos m, me
   where m.ativo = true
     and (
       m.nivel_minimo <= me.nivel
       or (m.nivel_minimo = me.nivel + 1 and m.is_preparativo)
     );
$$;

-- =====================================================================
-- FUNÇÃO: resgate atômico de brinde
-- =====================================================================
create or replace function public.fn_resgatar_brinde(
  p_brinde_id uuid
) returns table (
  resgate_id   uuid,
  codigo_unico text,
  custo        int,
  saldo_apos   int
) language plpgsql security definer as $$
declare
  v_usuario_id uuid := auth.uid();
  v_brinde     record;
  v_saldo      int;
  v_codigo     text;
  v_resgate_id uuid;
begin
  if v_usuario_id is null then raise exception 'NAO_AUTENTICADO'; end if;

  -- Lock no brinde para mexer no estoque
  select id, custo_bigocoins, estoque, ativo into v_brinde
    from public.brindes
   where id = p_brinde_id
     for update;

  if not found        then raise exception 'BRINDE_NAO_ENCONTRADO'; end if;
  if not v_brinde.ativo then raise exception 'BRINDE_INATIVO'; end if;
  if v_brinde.estoque <= 0 then raise exception 'SEM_ESTOQUE'; end if;

  -- Saldo atual (extrato é append-only — concorrência protegida pela transação)
  select coalesce(sum(valor),0)::int into v_saldo
    from public.bigocoins_extrato
   where usuario_id = v_usuario_id;

  if v_saldo < v_brinde.custo_bigocoins then raise exception 'SALDO_INSUFICIENTE'; end if;

  v_codigo := 'BIG-' || upper(substring(md5(random()::text || clock_timestamp()::text) for 8));

  update public.brindes set estoque = estoque - 1 where id = p_brinde_id;

  insert into public.resgates (usuario_id, brinde_id, codigo_unico, custo)
  values (v_usuario_id, p_brinde_id, v_codigo, v_brinde.custo_bigocoins)
  returning id into v_resgate_id;

  insert into public.bigocoins_extrato (usuario_id, valor, motivo, resgate_id)
  values (v_usuario_id, -v_brinde.custo_bigocoins, 'resgate_brinde', v_resgate_id);

  return query
    select v_resgate_id, v_codigo, v_brinde.custo_bigocoins, (v_saldo - v_brinde.custo_bigocoins);
end;
$$;

-- =====================================================================
-- FUNÇÃO: validação de cupom pelo gerente
-- =====================================================================
create or replace function public.fn_validar_cupom(p_codigo text)
returns table (
  resgate_id       uuid,
  brinde_nome      text,
  colaborador_nome text
) language plpgsql security definer as $$
declare
  v_resgate record;
  v_gerente_id uuid := auth.uid();
begin
  if v_gerente_id is null then raise exception 'NAO_AUTENTICADO'; end if;
  if not public.fn_sou_gerente_ou_master() then raise exception 'SEM_PERMISSAO'; end if;

  select r.id, r.status, r.expira_em, b.nome as brinde_nome, u.nome as colab_nome
    into v_resgate
    from public.resgates r
    join public.brindes  b on b.id = r.brinde_id
    join public.usuarios u on u.id = r.usuario_id
   where r.codigo_unico = p_codigo
     for update of r;

  if not found                       then raise exception 'CUPOM_INVALIDO'; end if;
  if v_resgate.status = 'validado'   then raise exception 'CUPOM_JA_VALIDADO'; end if;
  if v_resgate.status = 'cancelado'  then raise exception 'CUPOM_CANCELADO'; end if;
  if v_resgate.expira_em < now() then
    update public.resgates set status='expirado' where id = v_resgate.id;
    raise exception 'CUPOM_EXPIRADO';
  end if;

  update public.resgates
     set status='validado', validado_em=now(), validado_por=v_gerente_id
   where id = v_resgate.id;

  return query select v_resgate.id, v_resgate.brinde_nome, v_resgate.colab_nome;
end;
$$;

-- =====================================================================
-- FUNÇÃO: conclusão idempotente de módulo
-- =====================================================================
create or replace function public.fn_concluir_modulo(
  p_modulo_id uuid,
  p_nota_quiz int default null
) returns table (
  bigocoins_creditados int,
  saldo_apos           int
) language plpgsql security definer as $$
declare
  v_usuario_id uuid := auth.uid();
  v_recompensa int;
  v_quiz_min   int;
  v_status     public.status_modulo;
begin
  if v_usuario_id is null then raise exception 'NAO_AUTENTICADO'; end if;

  select recompensa_bigocoins into v_recompensa
    from public.modulos where id = p_modulo_id and ativo = true;
  if not found then raise exception 'MODULO_NAO_ENCONTRADO'; end if;

  select nota_minima into v_quiz_min
    from public.quizzes where modulo_id = p_modulo_id;
  if found and (p_nota_quiz is null or p_nota_quiz < v_quiz_min) then
    raise exception 'NOTA_INSUFICIENTE';
  end if;

  select status into v_status
    from public.progresso
   where usuario_id = v_usuario_id and modulo_id = p_modulo_id
     for update;

  if v_status = 'concluido' then
    return query select 0, (select saldo from public.saldo_bigocoins where usuario_id = v_usuario_id);
    return;
  end if;

  insert into public.progresso (usuario_id, modulo_id, status, nota_quiz, tentativas, concluido_em)
  values (v_usuario_id, p_modulo_id, 'concluido', p_nota_quiz, 1, now())
  on conflict (usuario_id, modulo_id) do update
     set status='concluido',
         nota_quiz = excluded.nota_quiz,
         tentativas = public.progresso.tentativas + 1,
         concluido_em = now();

  insert into public.bigocoins_extrato (usuario_id, valor, motivo, modulo_id)
  values (v_usuario_id, v_recompensa, 'modulo_concluido', p_modulo_id);

  return query
    select v_recompensa, (select saldo from public.saldo_bigocoins where usuario_id = v_usuario_id);
end;
$$;
