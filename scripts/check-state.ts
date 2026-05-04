import { Client } from "pg";

async function main() {
  const cs = process.argv[2];
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const enumR = await c.query(
    `select unnest(enum_range(null::public.tipo_conteudo))::text as valor`,
  );
  console.log("tipo_conteudo enum:");
  console.table(enumR.rows);

  const bucketsR = await c.query(`select id, public from storage.buckets order by id`);
  console.log("\nstorage buckets:");
  console.table(bucketsR.rows);

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
