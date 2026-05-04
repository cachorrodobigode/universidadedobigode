-- =====================================================================
-- 0009_imagem_e_brindes.sql
--
-- 1. Adiciona 'imagem' ao enum tipo_conteudo (slides em PDF e imagens
--    soltas como conteúdo de módulo).
-- 2. Cria bucket 'brindes' público (pra foto de brinde aparecer no
--    catálogo sem precisar de signed URL).
-- =====================================================================

alter type public.tipo_conteudo add value if not exists 'imagem';

insert into storage.buckets (id, name, public)
  values ('brindes', 'brindes', true)
  on conflict (id) do nothing;

-- Políticas: master pode escrever; todo authenticated pode ler.
do $$ begin
  drop policy if exists "brindes_master_insert" on storage.objects;
  drop policy if exists "brindes_master_update" on storage.objects;
  drop policy if exists "brindes_master_delete" on storage.objects;
  drop policy if exists "brindes_read_all" on storage.objects;
end $$;

create policy "brindes_master_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brindes' and public.fn_sou_master());

create policy "brindes_master_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'brindes' and public.fn_sou_master());

create policy "brindes_master_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brindes' and public.fn_sou_master());

create policy "brindes_read_all" on storage.objects
  for select to public
  using (bucket_id = 'brindes');
