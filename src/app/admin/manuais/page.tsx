import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function ManuaisPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Manuais (PDF)</h1>
        <p className="text-sm text-[var(--fg-muted)]">Upload e organização dos manuais corporativos.</p>
      </div>
      <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
        <div className="text-4xl mb-2">🚧</div>
        <h2 className="font-bold text-lg">Em construção</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          O upload de PDFs com compressão e watermark vem na Fase 2 do projeto.
          Por enquanto os PDFs ficam vinculados aos módulos via /admin/trilhas.
        </p>
      </div>
    </div>
  );
}
