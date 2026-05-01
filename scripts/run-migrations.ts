/**
 * Roda migrations + seed contra o Postgres do Supabase.
 *
 * Uso:
 *   npm run migrate -- "<connection-string-postgresql>"
 *
 * A connection string vem do Supabase Dashboard:
 *   Project Settings → Database → Connection string → URI (Session mode)
 *
 * É segura passar via argv porque o script só roda local e sai.
 */
import { Client } from "pg";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error("ERRO: passe a connection string como argumento.");
  console.error("Uso: npm run migrate -- \"postgresql://...\"");
  process.exit(1);
}

const ROOT = process.cwd();
const ARQUIVOS_NA_ORDEM = [
  "supabase/migrations/0001_schema.sql",
  "supabase/migrations/0002_rls_policies.sql",
  "supabase/seed/0001_cargos_default.sql",
];

async function rodar() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log("→ Conectando no Postgres...");
  await client.connect();
  console.log("✓ Conectado.");

  for (const rel of ARQUIVOS_NA_ORDEM) {
    const abs = join(ROOT, rel);
    const sql = readFileSync(abs, "utf-8");
    console.log(`\n→ Rodando ${rel} (${sql.length} bytes)...`);
    try {
      await client.query(sql);
      console.log(`✓ ${rel} OK`);
    } catch (err) {
      const e = err as Error & { position?: string; detail?: string };
      console.error(`✗ FALHA em ${rel}:`);
      console.error(`  ${e.message}`);
      if (e.detail) console.error(`  detail: ${e.detail}`);
      throw err;
    }
  }

  console.log("\n✓ Todas as migrations + seed aplicadas com sucesso.");
  await client.end();
}

rodar().catch((err) => {
  console.error("\n✗ Erro fatal:", err.message ?? err);
  process.exit(1);
});
