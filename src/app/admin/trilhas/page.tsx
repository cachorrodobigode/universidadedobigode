import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function TrilhasPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Trilhas e módulos</h1>
        <p className="text-sm text-[var(--fg-muted)]">Crie trilhas, adicione módulos com vídeo + PDF + quiz.</p>
      </div>
      <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
        <div className="text-4xl mb-2">📚</div>
        <h2 className="font-bold text-lg">Em construção</h2>
        <p className="text-sm text-[var(--fg-muted)]">Editor de trilhas com drag-and-drop vem na Fase 2.</p>
      </div>
    </div>
  );
}
