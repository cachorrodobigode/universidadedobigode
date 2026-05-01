import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { redirect } from "next/navigation";

export default async function CargosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const supabase = await createSupabaseServerClient();
  const { data: cargos } = await supabase
    .from("cargos")
    .select("id, nome, nivel, descricao, ativo")
    .order("nivel");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Cargos</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          A trilha é cumulativa: cargo de nível N vê módulos dos níveis ≤ N + um preparativo do nível N+1.
        </p>
      </div>

      <div className="rounded-xl bg-white border border-[var(--border)] p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--border)]">
              <th className="py-2 pr-4 font-bold">Nível</th>
              <th className="py-2 pr-4 font-bold">Nome</th>
              <th className="py-2 pr-4 font-bold">Descrição</th>
              <th className="py-2 pr-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(cargos ?? []).map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 pr-4 font-mono">{c.nivel}</td>
                <td className="py-3 pr-4 font-bold">{c.nome}</td>
                <td className="py-3 pr-4 text-[var(--fg-muted)]">{c.descricao ?? "-"}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${c.ativo ? "bg-[var(--success)] text-white" : "bg-gray-300"}`}>
                    {c.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-[var(--fg-muted)]">
          Os cargos padrão são criados pelo seed inicial. Alterações estruturais (adicionar/remover níveis)
          ainda devem ser feitas via SQL — vamos adicionar editor visual numa fase futura.
        </p>
      </div>
    </div>
  );
}
