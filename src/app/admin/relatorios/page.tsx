import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function RelatoriosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Relatórios</h1>
        <p className="text-sm text-[var(--fg-muted)]">KPIs da rede e ranking anual.</p>
      </div>
      <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
        <div className="text-4xl mb-2">📊</div>
        <h2 className="font-bold text-lg">Em construção</h2>
        <p className="text-sm text-[var(--fg-muted)]">Dashboards com taxa de conclusão, ranking e finalistas vem na Fase 4.</p>
      </div>
    </div>
  );
}
