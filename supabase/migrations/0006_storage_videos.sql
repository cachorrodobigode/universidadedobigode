-- =====================================================================
-- 0006_storage_videos.sql
--
-- Bucket privado pra upload de vídeos das trilhas.
-- - Criar 'videos' bucket privado
-- - Master pode upload/delete
-- - Todos autenticados podem ler (via signed URL)
-- - Adiciona valor 'video_upload' ao enum tipo_conteudo
-- =====================================================================

-- Cria o bucket se não existir
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 209715200, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set
  file_size_limit = 209715200,
  allowed_mime_types = array['video/mp4','video/webm','video/quicktime'];

-- Policies: leitura pra qualquer authenticated (controle real é via signed URL)
drop policy if exists videos_read on storage.objects;
create policy videos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'videos');

-- Insert/update/delete: só master
drop policy if exists videos_master_insert on storage.objects;
create policy videos_master_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and public.fn_sou_master());

drop policy if exists videos_master_update on storage.objects;
create policy videos_master_update on storage.objects
  for update to authenticated
  using (bucket_id = 'videos' and public.fn_sou_master())
  with check (bucket_id = 'videos' and public.fn_sou_master());

drop policy if exists videos_master_delete on storage.objects;
create policy videos_master_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and public.fn_sou_master());

-- Adiciona 'video_upload' ao enum existente (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_enum where enumtypid = 'public.tipo_conteudo'::regtype and enumlabel = 'video_upload'
  ) then
    alter type public.tipo_conteudo add value 'video_upload';
  end if;
end $$;
