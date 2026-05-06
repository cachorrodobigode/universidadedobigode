import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";
import type { Manual } from "@/lib/types/db";
import { CriarManualForm } from "./CriarManualForm";
import { ManualRow } from "./ManualRow";

export default async function ManuaisAdminPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("manuais")
    .select("*")
    .order("ordem")
    .order("criado_em");
  const manuais = (data ?? []) as Manual[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">📄 Manuais (PDF)</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Documentos corporativos acessíveis pelos colaboradores no app.
        </p>
      </div>

      <CriarManualForm nomePorNivel={NOME_POR_NIVEL} />

      {manuais.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-3xl mb-2">📄</p>
          <p className="font-bold">Nenhum manual cadastrado ainda.</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            Use o formulário acima para adicionar o primeiro manual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {manuais.map((m) => (
            <ManualRow key={m.id} manual={m} nomePorNivel={NOME_POR_NIVEL} />
          ))}
        </div>
      )}
    </div>
  );
}
