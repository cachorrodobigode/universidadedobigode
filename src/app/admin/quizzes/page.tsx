import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";

type ModuloComQuiz = {
  id: string;
  ordem: number;
  titulo: string;
  nivel_minimo: number;
  ativo: boolean;
  trilha_id: string;
  trilha: { id: string; nome: string } | { id: string; nome: string }[] | null;
  quiz: { id: string; nota_minima: number } | { id: string; nota_minima: number }[] | null;
};

type PerguntaCount = { quiz_id: string; count: string };

export default async function QuizzesAdminPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const admin = createSupabaseAdminClient();

  // Busca todos os módulos com info de trilha e quiz
  const { data: modulosRaw } = await admin
    .from("modulos")
    .select("id, ordem, titulo, nivel_minimo, ativo, trilha_id, trilha:trilhas(id, nome), quiz:quizzes(id, nota_minima)")
    .order("trilha_id")
    .order("ordem")
    .returns<ModuloComQuiz[]>();

  const modulos = modulosRaw ?? [];

  // Conta perguntas por quiz em uma query separada
  const quizIds = modulos
    .map((m) => {
      const q = Array.isArray(m.quiz) ? m.quiz[0] : m.quiz;
      return q?.id;
    })
    .filter(Boolean) as string[];

  let contagemPorQuiz = new Map<string, number>();
  if (quizIds.length > 0) {
    const { data: pergs } = await admin
      .from("quiz_perguntas")
      .select("quiz_id")
      .in("quiz_id", quizIds);
    for (const p of (pergs as { quiz_id: string }[] | null) ?? []) {
      const qid = p.quiz_id;
      contagemPorQuiz.set(qid, (contagemPorQuiz.get(qid) ?? 0) + 1);
    }
  }

  // Agrupa por trilha
  const porTrilha = new Map<string, { trilha_nome: string; modulos: ModuloComQuiz[] }>();
  for (const m of modulos) {
    const trilha = Array.isArray(m.trilha) ? m.trilha[0] : m.trilha;
    const tid = trilha?.id ?? "sem-trilha";
    const tnome = trilha?.nome ?? "(sem trilha)";
    if (!porTrilha.has(tid)) porTrilha.set(tid, { trilha_nome: tnome, modulos: [] });
    porTrilha.get(tid)!.modulos.push(m);
  }

  // Métricas rápidas
  const totalModulos = modulos.length;
  const comQuiz = modulos.filter((m) => {
    const q = Array.isArray(m.quiz) ? m.quiz[0] : m.quiz;
    return !!q;
  }).length;
  const semQuiz = totalModulos - comQuiz;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">❓ Quizzes</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Visão geral dos quizzes por módulo. Edite os quizzes dentro de cada trilha.
        </p>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total de módulos", valor: totalModulos, icone: "📚" },
          { label: "Com quiz", valor: comQuiz, icone: "✅" },
          { label: "Sem quiz", valor: semQuiz, icone: "⚠️" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-[var(--border)] p-4">
            <div className="text-2xl">{c.icone}</div>
            <div className="text-2xl font-extrabold mt-1">{c.valor}</div>
            <div className="text-xs font-semibold uppercase text-[var(--fg-muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      {modulos.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-3xl mb-2">📚</p>
          <p className="font-bold">Nenhum módulo cadastrado ainda.</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            Crie trilhas e módulos em{" "}
            <Link href="/admin/trilhas" className="underline text-[var(--primary)]">
              Trilhas e módulos
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...porTrilha.entries()].map(([trilhaId, grupo]) => (
            <div
              key={trilhaId}
              className="rounded-xl bg-white border border-[var(--border)] overflow-hidden"
            >
              <div className="px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-bold">{grupo.trilha_nome}</h2>
                <Link
                  href={`/admin/trilhas/${trilhaId}`}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Editar trilha →
                </Link>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {grupo.modulos.map((m) => {
                  const quiz = Array.isArray(m.quiz) ? m.quiz[0] : m.quiz;
                  const numPergs = quiz ? (contagemPorQuiz.get(quiz.id) ?? 0) : 0;
                  const temQuiz = !!quiz;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-4 px-4 py-3 ${!m.ativo ? "opacity-50" : ""}`}
                    >
                      <div className="w-8 text-center font-bold text-[var(--fg-muted)] text-sm shrink-0">
                        {m.ordem}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{m.titulo}</p>
                        <p className="text-xs text-[var(--fg-muted)]">
                          {NOME_POR_NIVEL[m.nivel_minimo] ?? `nível ${m.nivel_minimo}`}+
                          {!m.ativo && " · inativo"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {temQuiz ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5">
                              ✓ {numPergs} pergunta{numPergs !== 1 ? "s" : ""}
                            </span>
                            <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">
                              mín {quiz!.nota_minima}%
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5">
                            ⚠ sem quiz
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/admin/trilhas/${trilhaId}`}
                        className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--fg-muted)] text-center">
        💡 Para criar ou editar um quiz, acesse a trilha e use o editor de quiz dentro de cada módulo.
      </p>
    </div>
  );
}
