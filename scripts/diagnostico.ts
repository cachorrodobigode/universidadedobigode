import { Client } from "pg";

async function main() {
  const cs = process.argv[2];
  if (!cs) { console.error("Use: npm run diag -- '<connection-string>'"); process.exit(1); }

  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows: usuarios } = await client.query(
    "select id, cpf, nome, primeiro_login, ativo, is_master, is_gerente, cargo_id from public.usuarios"
  );
  console.log("Usuários em public.usuarios:");
  console.table(usuarios);

  const { rows: authUsers } = await client.query(
    "select id, email, email_confirmed_at, created_at from auth.users order by created_at desc limit 20"
  );
  console.log("\nAuth users (auth.users):");
  console.table(authUsers);

  const { rows: cargos } = await client.query("select nome, nivel from public.cargos order by nivel");
  console.log("\nCargos:");
  console.table(cargos);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
