import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CriarBrindeForm } from "./CriarBrindeForm";
import { BrindeRow } from "./BrindeRow";

export default async function BrindesPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const admin = createSupabaseAdminClient();
  const { data: brindes } = await admin
    .from("brindes")
    .select("id, nome, descricao, custo_bigocoins, estoque, foto_url, ativo")
    .order("nome");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Brindes 🎁</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Catálogo de brindes que os colaboradores resgatam com Bigocoins.
        </p>
      </div>

      <CriarBrindeForm />

      <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">Brindes cadastrados ({brindes?.length ?? 0})</h2>
        {(brindes ?? []).length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            Nenhum brinde ainda. Crie o primeiro no formulário acima.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {brindes!.map((b) => (
              <BrindeRow
                key={b.id as string}
                brinde={{
                  id: b.id as string,
                  nome: b.nome as string,
                  descricao: (b.descricao as string | null) ?? null,
                  custo_bigocoins: b.custo_bigocoins as number,
                  estoque: b.estoque as number,
                  foto_url: (b.foto_url as string | null) ?? null,
                  ativo: b.ativo as boolean,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
