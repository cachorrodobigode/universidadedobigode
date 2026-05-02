-- =====================================================================
-- 0005_multi_loja.sql
--
-- Permite que cargos elevados (Supervisor, Gerente, Master) cubram
-- múltiplas lojas, sem quebrar o modelo atual.
--
-- Modelo:
-- - public.usuarios.loja_id continua sendo a "loja principal" (pra
--   compatibilidade e pra colaboradores comuns).
-- - Nova tabela public.usuario_lojas é uma associação many-to-many
--   adicional. Se um Gerente cuida das lojas A, B e C, a loja_id
--   principal pode ser A, e B + C ficam em usuario_lojas.
-- - Cargos com nivel < 4 (atendente, cozinha, monitor, líder) seguem
--   tendo apenas uma loja (a loja_id da tabela principal).
-- =====================================================================

create table if not exists public.usuario_lojas (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  loja_id    uuid not null references public.lojas(id)    on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, loja_id)
);

create index if not exists usuario_lojas_loja_idx on public.usuario_lojas(loja_id);

alter table public.usuario_lojas enable row level security;

-- Leitura: own | master
drop policy if exists usuario_lojas_select on public.usuario_lojas;
create policy usuario_lojas_select on public.usuario_lojas
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.fn_sou_master()
  );

-- Escrita: master pode inserir/deletar associações
drop policy if exists usuario_lojas_modify on public.usuario_lojas;
create policy usuario_lojas_modify on public.usuario_lojas
  for all to authenticated
  using (public.fn_sou_master())
  with check (public.fn_sou_master());

-- Helper: lista todas as lojas que um usuário cobre (principal + extras).
create or replace function public.fn_minhas_lojas(p_usuario_id uuid default null)
returns table (loja_id uuid)
language sql stable security definer set search_path = public as $$
  select u.loja_id
    from public.usuarios u
   where u.id = coalesce(p_usuario_id, auth.uid())
     and u.loja_id is not null
  union
  select ul.loja_id
    from public.usuario_lojas ul
   where ul.usuario_id = coalesce(p_usuario_id, auth.uid());
$$;

grant execute on function public.fn_minhas_lojas(uuid) to authenticated;
