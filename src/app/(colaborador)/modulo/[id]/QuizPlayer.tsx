"use client";

import { useActionState, useEffect, useState } from "react";
import { responderQuizAction, type ResponderQuizState } from "./quiz-actions";
import { useRouter } from "next/navigation";

const inicial: ResponderQuizState = {};

type Alternativa = { id: string; texto: string; ordem: number };
type Pergunta = { id: string; pergunta: string; ordem: number; alternativas: Alternativa[] };

export function QuizPlayer({
  moduloId,
  notaMinima,
  perguntas,
  jaConcluido,
  recompensa,
}: {
  moduloId: string;
  notaMinima: number;
  perguntas: Pergunta[];
  jaConcluido: boolean;
  recompensa: number;
}) {
  const [state, action, pending] = useActionState(responderQuizAction, inicial);
  const router = useRouter();
  const [tentativa, setTentativa] = useState(0); // pra resetar form ao tentar de novo

  useEffect(() => {
    if (state.resultado?.passou) {
      // Refresh da página depois de 3s pra ela mostrar o estado "concluído"
      const t = setTimeout(() => router.refresh(), 3000);
      return () => clearTimeout(t);
    }
  }, [state.resultado, router]);

  if (jaConcluido) {
    return (
      <div className="rounded-xl bg-white border border-[var(--border)] p-6 flex items-center gap-3">
        <span className="text-3xl">✅</span>
        <div>
          <p className="font-bold">Quiz concluído!</p>
          <p className="text-xs text-[var(--fg-muted)]">
            Já recebeu {recompensa} 🪙 Bigocoins por esse módulo.
          </p>
        </div>
      </div>
    );
  }

  // Resultado da tentativa atual
  if (state.resultado) {
    const r = state.resultado;
    if (r.passou) {
      return (
        <div className="rounded-xl border-2 border-[var(--success)] bg-green-50 p-6 text-center space-y-2">
          <p className="text-5xl">🎉</p>
          <h3 className="font-extrabold text-xl text-[var(--success)]">
            Você passou! Nota {r.nota}%
          </h3>
          <p className="text-sm">
            Acertou {r.acertos} de {r.total} perguntas.
          </p>
          {r.bigocoins_creditados > 0 ? (
            <p className="font-bold text-lg">
              +{r.bigocoins_creditados} 🪙 Bigocoins! Saldo: {r.saldo_apos} 🪙
            </p>
          ) : (
            <p className="text-xs text-[var(--fg-muted)]">
              Você já tinha concluído esse módulo antes — Bigocoins não duplicam.
            </p>
          )}
          <p className="text-xs text-[var(--fg-muted)]">Voltando pra trilha em 3s...</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-[var(--accent)] bg-[#FFFBE6] p-6 text-center space-y-3">
        <p className="text-5xl">🤔</p>
        <h3 className="font-extrabold text-xl">Quase! Nota {r.nota}%</h3>
        <p className="text-sm">
          Acertou {r.acertos} de {r.total}. Precisa de pelo menos {notaMinima}% pra concluir.
        </p>
        <button
          onClick={() => {
            setTentativa((v) => v + 1);
            // Reload state via key change — re-renderiza form vazio
            window.location.reload();
          }}
          className="rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-5 py-2 font-bold"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <form key={tentativa} action={action} className="space-y-4">
      <input type="hidden" name="modulo_id" value={moduloId} />

      <div className="rounded-xl bg-white border border-[var(--border)] p-4">
        <p className="text-sm font-bold flex items-center gap-2">
          <span className="text-xl">❓</span> Quiz
        </p>
        <p className="text-xs text-[var(--fg-muted)] mt-1">
          {perguntas.length} {perguntas.length === 1 ? "pergunta" : "perguntas"} ·
          precisa de pelo menos <strong>{notaMinima}%</strong> pra concluir e ganhar
          os <strong>{recompensa} 🪙</strong>.
        </p>
        {state.erro && (
          <p className="mt-2 text-sm text-[var(--danger)]">{state.erro}</p>
        )}
      </div>

      {perguntas
        .sort((a, b) => a.ordem - b.ordem)
        .map((p, idx) => (
          <fieldset key={p.id} className="rounded-xl bg-white border border-[var(--border)] p-4 space-y-2">
            <legend className="font-bold text-sm">
              {idx + 1}. {p.pergunta}
            </legend>
            <div className="space-y-1.5">
              {p.alternativas
                .sort((a, b) => a.ordem - b.ordem)
                .map((a) => (
                  <label
                    key={a.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--bg)] cursor-pointer text-sm"
                  >
                    <input
                      type="radio"
                      name={`p_${p.id}`}
                      value={a.id}
                      required
                      className="mt-0.5"
                    />
                    <span>{a.texto}</span>
                  </label>
                ))}
            </div>
          </fieldset>
        ))}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] px-5 py-3 font-extrabold text-base disabled:opacity-50"
      >
        {pending ? "Corrigindo..." : "Enviar respostas"}
      </button>
    </form>
  );
}
