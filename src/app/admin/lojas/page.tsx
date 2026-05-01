import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LojaForm } from "./LojaForm";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { redirect } from "next/navigation";

export default async function LojasPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const supabase = await createSupabaseServerClient();
  const { data: lojas } = await supabase
    .from("lojas")
    .select("id, nome, cidade, ativa")
    .order("nome");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Lojas</h1>
        <p className="text-sm text-[var(--fg-muted)]">Cadastre cada unidade da rede.</p>
      </div>

      <LojaForm />

      <div className="rounded-xl bg-white border border-[var(--border)] p-6">
        <h2 className="font-bold mb-3">Lojas cadastradas ({lojas?.length ?? 0})</h2>
        {(lojas ?? []).length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">Nenhuma loja ainda. Adicione a primeira no formulário acima.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {lojas!.map((l) => (
              <li key={l.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-bold">{l.nome}</p>
                  {l.cidade && <p className="text-xs text-[var(--fg-muted)]">{l.cidade}</p>}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${l.ativa ? "bg-[var(--success)] text-white" : "bg-gray-300"}`}>
                  {l.ativa ? "Ativa" : "Inativa"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
