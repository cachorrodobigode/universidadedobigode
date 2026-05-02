-- =====================================================================
-- 0004_fix_recursao_funcoes.sql
--
-- Recria fn_sou_master, fn_sou_gerente_ou_master, fn_meu_nivel e
-- fn_modulos_visiveis com `set search_path = public` para que o
-- `security definer` funcione plenamente como dono (bypass de RLS).
--
-- Sem isso, em alguns ambientes do Postgres do Supabase a função
-- consulta public.usuarios → aciona a policy → chama fn_sou_master
-- → infinite recursion.
-- =====================================================================

create or replace function public.fn_meu_nivel()
returns int
language sql stable security definer set search_path = public as $$
  select c.nivel
    from public.usuarios u
    join public.cargos c on c.id = u.cargo_id
   where u.id = auth.uid()
     and u.ativo = true
   limit 1;
$$;

create or replace function public.fn_sou_master()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_master from public.usuarios where id = auth.uid() and ativo = true),
    false
  );
$$;

create or replace function public.fn_sou_gerente_ou_master()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (is_master or is_gerente) from public.usuarios
      where id = auth.uid() and ativo = true),
    false
  );
$$;

create or replace function public.fn_modulos_visiveis(p_usuario_id uuid default null)
returns table (modulo_id uuid)
language sql stable security definer set search_path = public as $$
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

grant execute on function public.fn_meu_nivel()              to authenticated;
grant execute on function public.fn_sou_master()             to authenticated;
grant execute on function public.fn_sou_gerente_ou_master()  to authenticated;
grant execute on function public.fn_modulos_visiveis(uuid)   to authenticated;
