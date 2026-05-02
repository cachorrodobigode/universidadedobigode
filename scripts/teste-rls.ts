import { Client } from "pg";

async function main() {
  const cs = process.argv[2];
  const userId = "d3714cc4-08d2-4e2a-a7af-a0f9e0110098"; // Deborah
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log("=== TESTE 1: SELECT direto em usuarios como authenticated ===");
  await c.query("BEGIN");
  await c.query("SET LOCAL ROLE authenticated");
  await c.query(
    `SET LOCAL "request.jwt.claims" TO '{"sub":"${userId}","role":"authenticated"}'`
  );
  try {
    const r = await c.query("SELECT id, cpf, nome, primeiro_login FROM public.usuarios WHERE id = $1", [userId]);
    console.log("rows:", r.rowCount);
    console.table(r.rows);
  } catch (e) {
    console.error("ERRO TESTE 1:", (e as Error).message);
  }
  await c.query("ROLLBACK");

  console.log("\n=== TESTE 2: chamada fn_meu_perfil_minimo() ===");
  await c.query("BEGIN");
  await c.query("SET LOCAL ROLE authenticated");
  await c.query(
    `SET LOCAL "request.jwt.claims" TO '{"sub":"${userId}","role":"authenticated"}'`
  );
  try {
    const r = await c.query("SELECT * FROM public.fn_meu_perfil_minimo()");
    console.log("rows:", r.rowCount);
    console.table(r.rows);
  } catch (e) {
    console.error("ERRO TESTE 2:", (e as Error).message);
  }
  await c.query("ROLLBACK");

  console.log("\n=== TESTE 3: SELECT via PostgREST simulando join ===");
  await c.query("BEGIN");
  await c.query("SET LOCAL ROLE authenticated");
  await c.query(
    `SET LOCAL "request.jwt.claims" TO '{"sub":"${userId}","role":"authenticated"}'`
  );
  try {
    const r = await c.query(`
      SELECT u.id, u.cpf, u.nome, u.primeiro_login,
             json_build_object('nome', cg.nome, 'nivel', cg.nivel) as cargo
      FROM public.usuarios u
      LEFT JOIN public.cargos cg ON cg.id = u.cargo_id
      WHERE u.id = $1`, [userId]);
    console.log("rows:", r.rowCount);
    console.table(r.rows);
  } catch (e) {
    console.error("ERRO TESTE 3:", (e as Error).message);
  }
  await c.query("ROLLBACK");

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
