import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function DashboardLojaPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario || (!usuario.is_master && !usuario.is_gerente)) redirect("/trilha");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Equipe da loja</h1>
        <p className="text-sm text-[var(--fg-muted)]">Desempenho dos colaboradores da sua loja.</p>
      </div>
      <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
        <div className="text-4xl mb-2">🏪</div>
        <h2 className="font-bold text-lg">Em construção</h2>
        <p className="text-sm text-[var(--fg-muted)]">Dashboard de loja com progresso de cada colaborador vem na Fase 4.</p>
      </div>
    </div>
  );
}
