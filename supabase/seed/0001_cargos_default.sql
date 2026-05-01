-- =====================================================================
-- Seed: cargos padrão da rede Cachorro do Bigode.
-- Roda uma vez ao popular o ambiente. Idempotente (on conflict do nothing).
-- =====================================================================

insert into public.cargos (nome, nivel, descricao) values
  ('Atendente',  0, 'Atendimento ao cliente — balcão, caixa, mesa, passa-prato'),
  ('Cozinha',    1, 'Operação de cozinha — produção, montagem, organização'),
  ('Monitor',    2, 'Monitoria de equipe — supervisiona atendentes/cozinha de um turno'),
  ('Líder',      3, 'Liderança de loja — responsável pela operação do turno'),
  ('Supervisor', 4, 'Supervisão de múltiplas lojas / regional'),
  ('Gerente',    5, 'Gerência operacional — gestão de lojas e equipes'),
  ('Master',    99, 'Acesso administrativo total — gestora geral da rede')
on conflict (nome) do nothing;
