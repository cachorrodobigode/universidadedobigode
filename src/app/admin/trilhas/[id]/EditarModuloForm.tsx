"use client";

import { useState, useActionState, useEffect } from "react";
import { editarModuloAction, type ActionState } from "../actions";
import { NIVEL_CARGO, NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";
import { toast } from "sonner";

const inicial: ActionState = {};

type Modulo = {
  id: string;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  ativo: boolean;
};

export function EditarModuloForm({
  modulo,
  trilhaId,
}: {
  modulo: Modulo;
  trilhaId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(editarModuloAction, inicial);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      setAberto(false);
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-bold rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--bg)]"
      >
        ✏️ Editar
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-lg bg-[#FFFBE6] border border-[var(--accent)] p-3 space-y-3"
    >
      <input type="hidden" name="id" value={modulo.id} />
      <input type="hidden" name="trilha_id" value={trilhaId} />

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase">Editando módulo</p>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-[var(--fg-muted)] hover:underline"
        >
          Cancelar
        </button>
      </div>

      <label className="block">
        <span className="text-xs font-semibold">Título</span>
        <input
          name="titulo"
          required
          minLength={3}
          defaultValue={modulo.titulo}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold">Descrição (opcional)</span>
        <textarea
          name="descricao"
          rows={2}
          defaultValue={modulo.descricao ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold">Recompensa 🪙</span>
          <input
            type="number"
            name="recompensa"
            min={0}
            defaultValue={modulo.recompensa_bigocoins}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold">Nível mínimo</span>
          <select
            name="nivel_minimo"
            defaultValue={String(modulo.nivel_minimo)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
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
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_preparativo" defaultChecked={modulo.is_preparativo} />
          <span>É módulo <strong>preparativo</strong> (cargo +1 também vê)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={modulo.ativo} />
          <span>Módulo <strong>ativo</strong></span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-2 font-bold text-sm disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
