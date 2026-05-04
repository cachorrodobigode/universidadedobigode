import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";
import { AddModuloForm } from "./AddModuloForm";
import { AddConteudoForm } from "./AddConteudoForm";
import { EditarTrilhaForm } from "./EditarTrilhaForm";
import { EditarModuloForm } from "./EditarModuloForm";
import { QuizEditor } from "./QuizEditor";
import { DeletarModuloButton, DeletarConteudoButton, DeletarTrilhaButton } from "./Botoes";

type Conteudo = {
  id: string;
  tipo: "video_youtube" | "video_upload" | "pdf" | "imagem";
  url: string;
  titulo: string | null;
  ordem: number;
};

type Alternativa = { id: string; texto: string; correta: boolean; ordem: number };
type Pergunta = { id: string; pergunta: string; ordem: number; alternativas: Alternativa[] };
type QuizDb = { id: string; nota_minima: number; perguntas: Pergunta[] };

type Modulo = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  ativo: boolean;
  conteudos: Conteudo[];
  quiz: QuizDb | QuizDb[] | null;
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
    .select("id, nome, descricao, cargo_id, ordem, ativa")
    .eq("id", id)
    .maybeSingle();
  if (!trilha) notFound();

  const { data: cargos } = await admin
    .from("cargos")
    .select("id, nome, nivel")
    .eq("ativo", true)
    .order("nivel");

  const { data: modulos } = await admin
    .from("modulos")
    .select(`
      id, ordem, titulo, descricao, recompensa_bigocoins,
      nivel_minimo, is_preparativo, ativo,
      conteudos ( id, tipo, url, titulo, ordem ),
      quiz:quizzes (
        id, nota_minima,
        perguntas:quiz_perguntas (
          id, pergunta, ordem,
          alternativas:quiz_alternativas ( id, texto, correta, ordem )
        )
      )
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
          {!trilha.ativa && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-gray-300 px-2 py-0.5 rounded">
              Inativa (não aparece pros colaboradores)
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <EditarTrilhaForm
            trilha={{
              id: trilha.id as string,
              nome: trilha.nome as string,
              descricao: (trilha.descricao as string | null) ?? null,
              cargo_id: (trilha.cargo_id as string | null) ?? null,
              ativa: trilha.ativa as boolean,
            }}
            cargos={(cargos ?? []) as { id: string; nome: string; nivel: number }[]}
          />
          <DeletarTrilhaButton id={trilha.id as string} nome={trilha.nome as string} />
        </div>
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
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <EditarModuloForm
                    modulo={{
                      id: m.id,
                      titulo: m.titulo,
                      descricao: m.descricao,
                      recompensa_bigocoins: m.recompensa_bigocoins,
                      nivel_minimo: m.nivel_minimo,
                      is_preparativo: m.is_preparativo,
                      ativo: m.ativo,
                    }}
                    trilhaId={trilha.id as string}
                  />
                  <DeletarModuloButton id={m.id} trilhaId={trilha.id as string} titulo={m.titulo} />
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-3 mt-3 space-y-2">
                <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-2">
                  Conteúdos ({m.conteudos?.length ?? 0})
                </p>
                {(m.conteudos ?? []).length === 0 ? (
                  <p className="text-xs text-[var(--fg-muted)] italic">Nenhum conteúdo ainda.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {m.conteudos
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((c) => {
                        const icone =
                          c.tipo === "video_youtube" ? "🔗" :
                          c.tipo === "video_upload" ? "🎬" :
                          c.tipo === "imagem" ? "🖼️" :
                          c.tipo === "pdf" ? "📄" : "📦";
                        const desc =
                          c.tipo === "video_youtube" ? `youtu.be/${c.url}` :
                          c.url.split("/").pop() || c.url;
                        return (
                          <li key={c.id} className="flex items-center gap-3 text-sm">
                            <span className="text-base">{icone}</span>
                            <span className="font-mono text-xs flex-1 truncate">
                              {c.titulo || desc}
                            </span>
                            <DeletarConteudoButton id={c.id} trilhaId={trilha.id as string} />
                          </li>
                        );
                      })}
                  </ul>
                )}
                <AddConteudoForm moduloId={m.id} trilhaId={trilha.id as string} />
              </div>

              <QuizEditor
                moduloId={m.id}
                trilhaId={trilha.id as string}
                quiz={(() => {
                  const q = Array.isArray(m.quiz) ? m.quiz[0] : m.quiz;
                  if (!q) return null;
                  return {
                    id: q.id,
                    nota_minima: q.nota_minima,
                    perguntas: q.perguntas ?? [],
                  };
                })()}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
