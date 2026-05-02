-- =====================================================================
-- 0003_perfil_minimo.sql
--
-- Cria fn_meu_perfil_minimo() — usada pelo middleware em vez de
-- .from('usuarios').select(). Garante que o middleware sempre consiga
-- ler o perfil do próprio user, sem recursão de policies via fn_sou_master.
-- =====================================================================

create or replace function public.fn_meu_perfil_minimo()
returns table (
  id              uuid,
  primeiro_login  boolean,
  ativo           boolean,
  is_master       boolean,
  is_gerente      boolean
)
language sql stable security definer set search_path = public as $$
  select id, primeiro_login, ativo, is_master, is_gerente
    from public.usuarios
   where id = auth.uid()
   limit 1;
$$;

grant execute on function public.fn_meu_perfil_minimo() to authenticated;
