-- =====================================================================
-- 0011_manuais.sql
--
-- Manuais corporativos em PDF (ex: manual do atendente, manual de cozinha).
-- - Tabela public.manuais com nivel_minimo para controle de acesso
-- - Bucket privado 'manuais' no Storage (signed URLs de 5 min)
-- - RLS: authenticated lê (master vê todos; outros só ativos)
--        apenas master pode criar/editar/deletar
-- =====================================================================

create table if not exists public.manuais (
  id            uuid        primary key default gen_random_uuid(),
  titulo        text        not null,
  descricao     text,
  arquivo_path  text        not null,  -- caminho no bucket 'manuais'
  nivel_minimo  int         not null default 0,
  ordem         int         not null default 0,
  ativo         boolean     not null default true,
  criado_em     timestamptz not null default now()
);

alter table public.manuais enable row level security;

-- Leitura: master vê todos; outros veem apenas ativos
drop policy if exists manuais_select on public.manuais;
create policy manuais_select on public.manuais
  for select to authenticated using (
    public.fn_sou_master()
    or ativo = true
  );

-- Escrita: só master
drop policy if exists manuais_master_modify on public.manuais;
create policy manuais_master_modify on public.manuais
  for all to authenticated
  using  (public.fn_sou_master())
  with check (public.fn_sou_master());

-- ── Storage: bucket privado 'manuais' ────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manuais', 'manuais', false,
  52428800,             -- 50 MB
  array['application/pdf']
)
on conflict (id) do update set
  file_size_limit   = 52428800,
  allowed_mime_types = array['application/pdf'];

-- Leitura: qualquer autenticado (controle real via signed URL + nivel_minimo)
drop policy if exists "manuais_read_auth" on storage.objects;
create policy "manuais_read_auth" on storage.objects
  for select to authenticated
  using (bucket_id = 'manuais');

-- Upload: só master
drop policy if exists "manuais_master_insert" on storage.objects;
create policy "manuais_master_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'manuais' and public.fn_sou_master());

drop policy if exists "manuais_master_update" on storage.objects;
create policy "manuais_master_update" on storage.objects
  for update to authenticated
  using  (bucket_id = 'manuais' and public.fn_sou_master())
  with check (bucket_id = 'manuais' and public.fn_sou_master());

drop policy if exists "manuais_master_delete" on storage.objects;
create policy "manuais_master_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'manuais' and public.fn_sou_master());
