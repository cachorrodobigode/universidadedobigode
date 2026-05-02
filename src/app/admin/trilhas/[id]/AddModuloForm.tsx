"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarModuloAction, type ActionState } from "../actions";
import { NIVEL_CARGO, NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";
import { toast } from "sonner";

const inicial: ActionState = {};

export function AddModuloForm({ trilhaId }: { trilhaId: string }) {
  const [state, action, pending] = useActionState(criarModuloAction, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      formRef.current?.reset();
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4"
    >
      <h2 className="font-bold">Novo módulo</h2>

      <input type="hidden" name="trilha_id" value={trilhaId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Título</span>
          <input
            name="titulo"
            required
            minLength={3}
            placeholder="Ex.: Atendimento no balcão"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Descrição (opcional)</span>
          <textarea
            name="descricao"
            rows={2}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nível mínimo do cargo</span>
          <select
            name="nivel_minimo"
            defaultValue="0"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            {Object.entries(NOME_POR_NIVEL)
              .filter(([n]) => Number(n) <= NIVEL_CARGO.FRANQUEADORA)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([nivel, nome]) => (
                <option key={nivel} value={nivel}>
                  {nome} (nível {nivel}+)
                </option>
              ))}
          </select>
          <span className="text-xs text-[var(--fg-muted)]">
            Cumulativo: nível 2 (Monitor) também vê módulos de nível 0 e 1.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Recompensa (🪙 Bigocoins)</span>
          <input
            type="number"
            name="recompensa"
            min={0}
            defaultValue={10}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="is_preparativo" />
          <span className="text-sm">
            <strong>Módulo preparativo:</strong> visível só pra quem é exatamente o nível anterior
            (ex.: marcar isso num módulo de nível 2 faz Atendentes (0) NÃO verem, mas o nível 1 vê
            como "preparação para subir").
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Adicionar módulo"}
      </button>
    </form>
  );
}
