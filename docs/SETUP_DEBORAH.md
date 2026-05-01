# Guia de configuração — Deborah

Esse guia te ajuda a criar as contas necessárias e colocar o app no ar. Não precisa saber programar — eu (Claude) faço junto com você. Cada passo tem um link e o que clicar.

> ⏱️ Tempo estimado: **30 a 45 minutos** na primeira vez.

---

## 1. GitHub (onde o código fica guardado) — 5 min

> Por quê: a Vercel pega o código direto do GitHub para publicar. Também serve de backup do projeto.

1. Acesse https://github.com/signup
2. Use seu email da empresa.
3. Escolha um nome de usuário (sugestão: `cachorrodobigode`).
4. Confirme o email.
5. Plano **Free** está ótimo. Não precisa de Pro.

✅ Pronto. Me avise quando terminar e eu subo o código pra um repositório novo.

---

## 2. Supabase (banco de dados + login) — 10 min

> Por quê: é onde ficam os colaboradores, módulos, quizzes, bigocoins. Plano gratuito atende até ~200 colaboradores.

1. Acesse https://supabase.com/dashboard/sign-up
2. **Sign up with GitHub** (usa a conta que você acabou de criar).
3. Cria um novo projeto:
   - Name: `trilha-do-bigode`
   - Database password: **gera uma senha forte e GUARDA num lugar seguro** (não vai precisar quase nunca, mas guarde)
   - Region: **South America (São Paulo)**
   - Plan: **Free**
4. Aguarda ~2 minutos enquanto o projeto é criado.

### 2.1. Pegar as chaves de acesso

Depois que o projeto subir:

1. No menu lateral, vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie e me mande **três valores**:
   - **Project URL** (https://xxxxx.supabase.co)
   - **anon public** key (uma chave que começa com `eyJ...`)
   - **service_role** key (outra `eyJ...`, está abaixo da anon, marcada como secret)

> ⚠️ A `service_role` é uma chave de admin. **Nunca compartilhe com colaboradores nem cole em mensagens públicas.** Pra mim aqui no Claude está OK porque é ambiente seguro.

### 2.2. Rodar as migrations (criar as tabelas)

1. No menu lateral do Supabase, vá em **SQL Editor**.
2. Vou te dar 3 arquivos pra rodar nesta ordem:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_rls_policies.sql`
   3. `supabase/seed/0001_cargos_default.sql`

Pra cada um: **copia o conteúdo → cola no SQL Editor → clica em RUN (canto inferior direito)**. Tem que aparecer "Success" embaixo. Se aparecer erro, me chama.

### 2.3. Criar sua conta master (Deborah)

1. Ainda no Supabase, vá em **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: `<seu-cpf-só-números>@cdb.app` (ex: `12345678900@cdb.app`)
3. Password: seu CPF (mesmo número)
4. Marque **Auto Confirm User** = SIM
5. Clica em **Create user**.

Agora marque essa conta como master no banco:

1. **SQL Editor** → cola e roda este SQL (substituindo seu CPF):
   ```sql
   insert into public.usuarios (id, cpf, nome, cargo_id, is_master, primeiro_login, ativo)
   select
     u.id,
     '<SEU_CPF_SO_NUMEROS>',
     'Deborah - Master',
     (select id from public.cargos where nome = 'Master'),
     true,
     true,
     true
   from auth.users u
   where u.email = '<SEU_CPF_SO_NUMEROS>@cdb.app';
   ```

✅ Quando você logar pela primeira vez no app, vai entrar como master.

---

## 3. Vercel (publicar o app na internet) — 10 min

> Por quê: a Vercel transforma o código do GitHub em um site real (ex: trilhadobigode.vercel.app). Plano gratuito atende ao seu caso.

1. Acesse https://vercel.com/signup
2. **Continue with GitHub**.
3. Plano **Hobby** (grátis).
4. Depois que eu subir o código pro GitHub:
   - **Add New** → **Project**
   - Selecione o repositório `app-trilha-cdb`
   - Em **Environment Variables**, preencha:
     - `NEXT_PUBLIC_SUPABASE_URL` → o Project URL do Supabase
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → a anon key
     - `SUPABASE_SERVICE_ROLE_KEY` → a service_role key
   - Clica **Deploy**.
5. Em ~2 minutos, o app sobe em uma URL tipo `https://trilha-do-bigode.vercel.app`.

✅ Esse já é o app no ar.

---

## 4. Domínio próprio (opcional) — R$40/ano

> Se quiser uma URL bonita tipo `app.cachorrodobigode.com.br` em vez de `trilha-do-bigode.vercel.app`.

1. Compra o domínio em https://registro.br (~R$40/ano).
2. Na Vercel: **Project Settings** → **Domains** → **Add** → digita o domínio.
3. A Vercel mostra registros DNS que você cola no painel do registro.br.
4. Em ~30 minutos o domínio funciona.

---

## 5. Backup automático do banco — 5 min (mais tarde)

O plano Free do Supabase **não faz backup point-in-time**. Pra não correr risco de perder dados:

1. Cria conta na Cloudflare (https://cloudflare.com) — grátis pra R2 storage até 10GB.
2. Eu configuro um GitHub Action que roda `pg_dump` todo dia 3h da manhã e salva no R2.

Faz isso depois que o app já estiver no ar há 1-2 semanas.

---

## Resumo de custos

| Item | Custo |
|---|---|
| GitHub Free | R$ 0 |
| Supabase Free | R$ 0 (até estourar 1GB de PDFs) |
| Vercel Hobby | R$ 0 |
| Cloudflare R2 (backup) | R$ 0 |
| Domínio .com.br (opcional) | ~R$ 40/ano |
| **Total** | **~R$ 3/mês** |

Quando a rede crescer e estourar 1GB de armazenamento de PDFs, vai precisar do **Supabase Pro** ($25/mês ≈ R$130). Nessa altura o app já está rodando estável e pago.

---

## Coisas que VOCÊ NÃO precisa fazer

- ❌ Programar
- ❌ Mexer no terminal
- ❌ Configurar servidor
- ❌ Cuidar de backup manual

Coisas que **SIM** vai fazer no dia-a-dia (no painel do app, sem código):

- ✅ Cadastrar colaborador
- ✅ Subir vídeo (cola URL do YouTube não-listado)
- ✅ Subir PDF
- ✅ Editar quiz
- ✅ Ver ranking e relatórios
- ✅ Cadastrar brindes
- ✅ Resetar senha de colaborador (gerente faz, pra você cobrir só caso de emergência)

---

## Em caso de problema

Se algo travar, o que fazer:

1. **Tira print da tela** mostrando o erro.
2. Me manda o print + descreve o que tava fazendo.
3. Não tenta consertar sozinha — o risco de mexer onde não deve é maior do que esperar 10 min pra eu resolver.
