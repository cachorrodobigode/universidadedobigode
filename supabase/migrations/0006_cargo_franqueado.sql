-- =====================================================================
-- 0006_cargo_franqueado.sql
--
-- Adiciona o cargo Franqueado (nivel 6), entre Gerente (5) e Master (99).
-- - Tem acesso aos módulos próprios (nivel_minimo=6)
-- - Pelo desenho cumulativo, vê tudo de operacional (níveis ≤ 6)
-- - É marcado como is_gerente automaticamente no cadastro pra poder
--   cadastrar colaboradores das suas lojas (regra: nivel >= SUPERVISOR=4)
-- =====================================================================

insert into public.cargos (nome, nivel, descricao) values
  ('Franqueado', 6, 'Dono(a) de uma ou mais unidades. Cadastra colaboradores das próprias lojas e tem trilha exclusiva de gestão de franquia.')
on conflict (nome) do nothing;
