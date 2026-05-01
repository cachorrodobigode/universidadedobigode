/**
 * Cria um usuário com elevação master ou gerente, via Supabase Admin API.
 *
 * Uso:
 *   npm run criar-master -- "<cpf-só-dígitos>" "<nome completo>"
 *   npm run criar-gerente -- "<cpf-só-dígitos>" "<nome completo>" "<id-da-loja>"
 *
 * Lê chaves do .env.local automaticamente.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function carregarEnv() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error("ERRO: .env.local não encontrado em", path);
    process.exit(1);
  }
  const linhas = readFileSync(path, "utf-8").split(/\r?\n/);
  for (const ln of linhas) {
    const trimmed = ln.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (slice: string, factor: number) => {
    let s = 0;
    for (const c of slice) s += parseInt(c, 10) * factor--;
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(d.slice(0, 9), 10) === parseInt(d[9], 10) &&
         calc(d.slice(0, 10), 11) === parseInt(d[10], 10);
}

const tipo = process.argv[2]; // 'master' | 'gerente'
const cpfRaw = process.argv[3];
const nome = process.argv[4];
const lojaId = process.argv[5];

if (!tipo || !cpfRaw || !nome) {
  console.error("Uso: tsx scripts/criar-usuario-admin.ts <master|gerente> <cpf> <nome> [loja_id]");
  process.exit(1);
}
if (tipo !== "master" && tipo !== "gerente") {
  console.error("Tipo inválido. Use 'master' ou 'gerente'.");
  process.exit(1);
}

const cpf = cpfRaw.replace(/\D/g, "");
if (!cpfValido(cpf)) {
  console.error("CPF inválido:", cpfRaw);
  process.exit(1);
}

carregarEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dominio = process.env.INTERNAL_AUTH_DOMAIN ?? "cdb.app";

if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = `${cpf}@${dominio}`;
  console.log(`→ Verificando se ${email} já existe...`);

  const { data: existentes } = await admin.from("usuarios").select("id, nome").eq("cpf", cpf).maybeSingle();
  if (existentes) {
    console.error(`✗ CPF ${cpf} já está cadastrado como '${existentes.nome}'.`);
    process.exit(1);
  }

  console.log("→ Criando auth user...");
  const { data: novoAuth, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: cpf,
    email_confirm: true,
  });
  if (authErr || !novoAuth.user) {
    console.error("✗ Erro criando auth user:", authErr?.message);
    process.exit(1);
  }
  console.log(`✓ auth.users criado: ${novoAuth.user.id}`);

  const cargoNome = tipo === "master" ? "Master" : "Gerente";
  const { data: cargo, error: cgErr } = await admin
    .from("cargos")
    .select("id")
    .eq("nome", cargoNome)
    .single();
  if (cgErr || !cargo) {
    console.error(`✗ Não achei cargo '${cargoNome}' no banco. Rodou o seed?`);
    await admin.auth.admin.deleteUser(novoAuth.user.id);
    process.exit(1);
  }

  console.log("→ Inserindo em public.usuarios...");
  const { error: upErr } = await admin.from("usuarios").insert({
    id: novoAuth.user.id,
    cpf,
    nome,
    cargo_id: cargo.id,
    loja_id: lojaId || null,
    is_master: tipo === "master",
    is_gerente: tipo === "gerente" || tipo === "master",
    primeiro_login: true,
    ativo: true,
  });
  if (upErr) {
    console.error("✗ Erro inserindo perfil:", upErr.message);
    await admin.auth.admin.deleteUser(novoAuth.user.id);
    process.exit(1);
  }

  console.log(`\n✓ Conta ${tipo.toUpperCase()} criada com sucesso!`);
  console.log(`  Login: ${cpf} (CPF)`);
  console.log(`  Senha inicial: ${cpf} (mesmo CPF — você troca no primeiro login)`);
  console.log(`  Cargo: ${cargoNome}`);
}

main().catch((err) => {
  console.error("\n✗ Erro fatal:", err.message ?? err);
  process.exit(1);
});
