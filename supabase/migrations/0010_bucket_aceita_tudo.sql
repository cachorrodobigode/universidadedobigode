-- =====================================================================
-- 0010_bucket_aceita_tudo.sql
--
-- O bucket 'videos' foi criado com allowed_mime_types restrito só a
-- vídeos. Como agora aceitamos imagens e PDFs como conteúdo de módulo,
-- libera pra qualquer mime type. A validação fica no client (accept
-- attribute) e na action (TIPO_DB).
--
-- Também eleva o limite de tamanho.
-- =====================================================================

update storage.buckets
   set allowed_mime_types = null,
       file_size_limit = 209715200  -- 200 MB
 where id = 'videos';

-- Bucket 'brindes' (criado em 0009) — garante que aceita imagens.
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'],
       file_size_limit = 5242880  -- 5 MB
 where id = 'brindes';
