"use client";

import { useActionState, useEffect, useState, useTransition, useRef } from "react";
import {
  criarQuizAction,
  adicionarPerguntaAction,
  deletarPerguntaAction,
  deletarQuizAction,
  type QuizState,
} from "./quiz-actions";
import { toast } from "sonner";

const inicial: QuizState = {};

type Alternativa = { id: string; texto: string; correta: boolean; ordem: number };
type Pergunta = { id: string; pergunta: string; ordem: number; alternativas: Alternativa[] };
type Quiz = {
  id: string;
  nota_minima: number;
  perguntas: Pergunta[];
};

export function QuizEditor({
  moduloId,
  trilhaId,
  quiz,
}: {
  moduloId: string;
  trilhaId: string;
  quiz: Quiz | null;
}) {
  const [criarState, criarAction, criarPending] = useActionState(criarQuizAction, inicial);
  const [, deletarQuizStart] = useTransition();
  const [, deletarPerguntaStart] = useTransition();

  useEffect(() => {
    if (criarState.ok) toast.success(criarState.ok);
    if (criarState.erro) toast.error(criarState.erro);
  }, [criarState]);

  if (!quiz) {
    return (
      <form action={criarAction} className="border-t border-[var(--border)] pt-3 mt-3">
        <input type="hidden" name="modulo_id" value={moduloId} />
        <input type="hidden" name="trilha_id" value={trilhaId} />
        <input type="hidden" name="nota_minima" value="70" />
        <button
          type="submit"
          disabled={criarPending}
          className="text-xs font-bold rounded-md border border-dashed border-[var(--accent)] bg-[#FFFBE6] px-3 py-2 hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition disabled:opacity-50"
        >
          {criarPending ? "Criando..." : "+ ❓ Quiz desse módulo"}
        </button>
      </form>
    );
  }

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase text-[var(--fg-muted)]">
          ❓ Quiz ({quiz.perguntas.length} {quiz.perguntas.length === 1 ? "pergunta" : "perguntas"})
          · nota mínima {quiz.nota_minima}%
        </p>
        <button
          onClick={() => {
            if (!confirm("Apagar o quiz inteiro? Todas as perguntas vão junto.")) return;
            const fd = new FormData();
            fd.set("quiz_id", quiz.id);
            fd.set("trilha_id", trilhaId);
            deletarQuizStart(async () => {
              const r = await deletarQuizAction({}, fd);
              if (r.erro) toast.error(r.erro);
              else toast.success(r.ok ?? "Removido.");
            });
          }}
          className="text-[10px] text-[var(--danger)] hover:underline"
        >
          Apagar quiz
        </button>
      </div>

      {quiz.perguntas.length === 0 ? (
        <p className="text-xs text-[var(--fg-muted)] italic">Nenhuma pergunta ainda. Adicione a primeira abaixo.</p>
      ) : (
        <ul className="space-y-2">
          {quiz.perguntas
            .sort((a, b) => a.ordem - b.ordem)
            .map((p) => (
              <li key={p.id} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {p.ordem}. {p.pergunta}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {p.alternativas
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((a) => (
                          <li key={a.id} className="text-xs flex items-start gap-2">
                            <span className={a.correta ? "text-[var(--success)] font-bold" : "text-[var(--fg-muted)]"}>
                              {a.correta ? "✓" : "·"}
                            </span>
                            <span className={a.correta ? "font-semibold" : ""}>{a.texto}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm("Apagar essa pergunta?")) return;
                      const fd = new FormData();
                      fd.set("pergunta_id", p.id);
                      fd.set("trilha_id", trilhaId);
                      deletarPerguntaStart(async () => {
                        const r = await deletarPerguntaAction({}, fd);
                        if (r.erro) toast.error(r.erro);
                        else toast.success(r.ok ?? "Removida.");
                      });
                    }}
                    className="text-[10px] text-[var(--danger)] hover:underline shrink-0"
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}

      <AdicionarPerguntaForm quizId={quiz.id} trilhaId={trilhaId} />
    </div>
  );
}

function AdicionarPerguntaForm({ quizId, trilhaId }: { quizId: string; trilhaId: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(adicionarPerguntaAction, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      formRef.current?.reset();
      setAberto(false);
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-bold rounded-md border border-dashed border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--bg)]"
      >
        + Adicionar pergunta
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="bg-white border border-[var(--accent)] rounded-lg p-3 space-y-3">
      <input type="hidden" name="quiz_id" value={quizId} />
      <input type="hidden" name="trilha_id" value={trilhaId} />

      <label className="block">
        <span className="text-xs font-semibold">Pergunta</span>
        <textarea
          name="pergunta"
          required
          rows={2}
          placeholder="Ex.: Qual a saudação correta ao receber o cliente?"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">Alternativas (marque a certa)</p>
        {[0, 1, 2, 3, 4].map((i) => (
          <label key={i} className="flex items-center gap-2">
            <input type="radio" name="correta" value={i} required={i === 0} />
            <input
              name={`alt_${i}`}
              placeholder={i < 2 ? `Alternativa ${i + 1} (obrigatória)` : `Alternativa ${i + 1} (opcional)`}
              required={i < 2}
              className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="text-xs font-semibold">Explicação (opcional, mostrada após responder)</span>
        <textarea
          name="explicacao"
          rows={1}
          placeholder="Ex.: A saudação correta é..."
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-bold rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar pergunta"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm rounded-lg border border-[var(--border)] bg-white px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
