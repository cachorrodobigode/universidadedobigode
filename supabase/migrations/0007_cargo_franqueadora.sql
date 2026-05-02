-- =====================================================================
-- 0007_cargo_franqueadora.sql
--
-- Adiciona o cargo Franqueadora (nivel 7), entre Franqueado (6) e Master (99).
-- Funcionários da MATRIZ (CDB), com acesso a todas as lojas.
-- Diferença vs Master: não administra (não cria trilhas, não mexe em
-- cargos/lojas), só consome conteúdo + cadastra/edita colaboradores.
-- =====================================================================

insert into public.cargos (nome, nivel, descricao) values
  ('Franqueadora', 7, 'Funcionário(a) da matriz Cachorro do Bigode. Acesso operacional a todas as lojas. Não pode ser editado(a) por Franqueados — somente pelo Master.')
on conflict (nome) do nothing;
