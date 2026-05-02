"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { concluirModuloAction, type ConcluirState } from "./actions";
import { toast } from "sonner";

const inicial: ConcluirState = {};

export function ConcluirModuloForm({
  moduloId,
  recompensa,
}: {
  moduloId: string;
  recompensa: number;
}) {
  const [state, action, pending] = useActionState(concluirModuloAction, inicial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      const creditados = state.bigocoinsCreditados ?? 0;
      if (creditados > 0) {
        toast.success(`+${creditados} 🪙 Bigocoins! Saldo: ${state.saldoApos ?? 0}`);
      }
      // Pequena pausa pra usuário ver o toast antes de voltar
      setTimeout(() => router.push("/trilha"), 1500);
    }
    if (state.erro) toast.error(state.erro);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col sm:flex-row sm:items-center gap-3">
      <input type="hidden" name="modulo_id" value={moduloId} />
      <div className="flex-1">
        <p className="font-bold">Já assistiu o conteúdo?</p>
        <p className="text-xs text-[var(--fg-muted)]">
          Marca como concluído pra ganhar <strong>+{recompensa} 🪙 Bigocoins</strong>.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--success)] text-white px-5 py-2.5 font-bold hover:opacity-95 disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? "Salvando..." : "✓ Concluir módulo"}
      </button>
    </form>
  );
}
