import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CriarTrilhaForm } from "./CriarTrilhaForm";

export default async function TrilhasPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const admin = createSupabaseAdminClient();
  const [{ data: trilhas }, { data: cargos }] = await Promise.all([
    admin
      .from("trilhas")
      .select("id, nome, descricao, ordem, ativa, cargo:cargos(nome)")
      .order("ordem"),
    admin.from("cargos").select("id, nome, nivel").eq("ativo", true).order("nivel"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Trilhas e módulos</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Trilha = um conjunto de módulos. Cada módulo tem um vídeo e (opcional) quiz.
          A regra de quem vê o quê é por nível do cargo (cumulativa).
        </p>
      </div>

      <CriarTrilhaForm cargos={cargos ?? []} />

      <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">Trilhas cadastradas ({trilhas?.length ?? 0})</h2>
        {(trilhas ?? []).length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">Nenhuma trilha ainda. Crie a primeira no formulário acima.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {trilhas!.map((t) => (
              <li key={t.id as string} className="py-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/admin/trilhas/${t.id}`}
                    className="font-bold hover:text-[var(--primary)] underline-offset-2 hover:underline"
                  >
                    {t.nome}
                  </Link>
                  {t.descricao && <p className="text-xs text-[var(--fg-muted)] mt-0.5">{t.descricao as string}</p>}
                  {(t.cargo as unknown as { nome?: string })?.nome && (
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                      Cargo associado: <strong>{(t.cargo as unknown as { nome: string }).nome}</strong>
                    </p>
                  )}
                </div>
                <Link
                  href={`/admin/trilhas/${t.id}`}
                  className="text-xs font-bold rounded-md bg-[var(--bg)] border border-[var(--border)] px-3 py-1.5 hover:bg-white"
                >
                  Editar módulos →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
