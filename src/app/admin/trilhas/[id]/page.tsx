import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";
import { AddModuloForm } from "./AddModuloForm";
import { AddConteudoForm } from "./AddConteudoForm";
import { DeletarModuloButton, DeletarConteudoButton, DeletarTrilhaButton } from "./Botoes";

type Conteudo = {
  id: string;
  tipo: "video_youtube" | "pdf";
  url: string;
  titulo: string | null;
  ordem: number;
};

type Modulo = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  conteudos: Conteudo[];
};

export default async function TrilhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: trilha } = await admin
    .from("trilhas")
    .select("id, nome, descricao, ordem, ativa")
    .eq("id", id)
    .maybeSingle();
  if (!trilha) notFound();

  const { data: modulos } = await admin
    .from("modulos")
    .select(`
      id, ordem, titulo, descricao, recompensa_bigocoins,
      nivel_minimo, is_preparativo,
      conteudos ( id, tipo, url, titulo, ordem )
    `)
    .eq("trilha_id", id)
    .order("ordem", { ascending: true })
    .returns<Modulo[]>();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/trilhas" className="text-xs text-[var(--fg-muted)] hover:underline">
            ← Trilhas
          </Link>
          <h1 className="text-2xl font-extrabold mt-1">{trilha.nome as string}</h1>
          {trilha.descricao && (
            <p className="text-sm text-[var(--fg-muted)] mt-1">{trilha.descricao as string}</p>
          )}
        </div>
        <DeletarTrilhaButton id={trilha.id as string} nome={trilha.nome as string} />
      </div>

      <AddModuloForm trilhaId={trilha.id as string} />

      <div className="space-y-3">
        {(modulos ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
            <p className="text-4xl mb-2">📚</p>
            <p className="text-sm text-[var(--fg-muted)]">
              Adicione o primeiro módulo no formulário acima.
            </p>
          </div>
        ) : (
          modulos!.map((m) => (
            <div key={m.id} className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase text-[var(--fg-muted)]">
                      Módulo {m.ordem}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">
                      {NOME_POR_NIVEL[m.nivel_minimo] ?? `nível ${m.nivel_minimo}`}+
                    </span>
                    {m.is_preparativo && (
                      <span className="text-[10px] font-bold uppercase bg-[var(--secondary)] text-[var(--secondary-fg)] px-2 py-0.5 rounded">
                        Preparativo
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase bg-[var(--accent)] text-[var(--accent-fg)] px-2 py-0.5 rounded">
                      +{m.recompensa_bigocoins} 🪙
                    </span>
                  </div>
                  <h3 className="font-bold text-base mt-1">{m.titulo}</h3>
                  {m.descricao && (
                    <p className="text-sm text-[var(--fg-muted)] mt-1">{m.descricao}</p>
                  )}
                </div>
                <DeletarModuloButton id={m.id} trilhaId={trilha.id as string} titulo={m.titulo} />
              </div>

              <div className="border-t border-[var(--border)] pt-3 mt-3 space-y-2">
                <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-2">
                  Conteúdos ({m.conteudos?.length ?? 0})
                </p>
                {(m.conteudos ?? []).length === 0 ? (
                  <p className="text-xs text-[var(--fg-muted)] italic">Nenhum vídeo ainda.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {m.conteudos
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((c) => (
                        <li key={c.id} className="flex items-center gap-3 text-sm">
                          <span className="text-base">🎬</span>
                          <span className="font-mono text-xs flex-1 truncate">
                            {c.titulo || `youtu.be/${c.url}`}
                          </span>
                          <DeletarConteudoButton id={c.id} trilhaId={trilha.id as string} />
                        </li>
                      ))}
                  </ul>
                )}
                <AddConteudoForm moduloId={m.id} trilhaId={trilha.id as string} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
