-- =====================================================================
-- 0008_view_ranking.sql
--
-- View agregada com métricas de ranking por colaborador.
-- - bigocoins_ganhos: soma só dos valores POSITIVOS do extrato
--   (concluir módulo, ajustes de master). Quem gastou em brindes
--   não cai no ranking — é justo.
-- - modulos_concluidos: count de progresso com status='concluido'.
-- =====================================================================

create or replace view public.ranking_colaboradores as
  select
    u.id as usuario_id,
    u.nome,
    u.loja_id,
    u.cargo_id,
    u.ativo,
    u.is_master,
    u.is_gerente,
    coalesce(c.nome, '—') as cargo_nome,
    coalesce(c.nivel, 0) as cargo_nivel,
    coalesce(l.nome, '—') as loja_nome,
    coalesce((
      select sum(valor)::int from public.bigocoins_extrato
      where usuario_id = u.id and valor > 0
    ), 0) as bigocoins_ganhos,
    coalesce((
      select count(*)::int from public.progresso
      where usuario_id = u.id and status = 'concluido'
    ), 0) as modulos_concluidos
  from public.usuarios u
  left join public.cargos c on c.id = u.cargo_id
  left join public.lojas l on l.id = u.loja_id;

-- Permite leitura via service role (Server Components usam admin client).
-- A página /ranking decide o que filtrar baseado no cargo do user.
