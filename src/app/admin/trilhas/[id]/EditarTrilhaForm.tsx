"use client";

import { useActionState, useEffect, useState } from "react";
import { editarTrilhaAction, type ActionState } from "../actions";
import { toast } from "sonner";

const inicial: ActionState = {};

type Cargo = { id: string; nome: string; nivel: number };
type Trilha = {
  id: string;
  nome: string;
  descricao: string | null;
  cargo_id: string | null;
  ativa: boolean;
};

export function EditarTrilhaForm({
  trilha,
  cargos,
}: {
  trilha: Trilha;
  cargos: Cargo[];
}) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(editarTrilhaAction, inicial);

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
        ✏️ Editar trilha
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-xl bg-[#FFFBE6] border border-[var(--accent)] p-6 space-y-4"
    >
      <input type="hidden" name="id" value={trilha.id} />

      <div className="flex items-center justify-between">
        <h2 className="font-bold">Editando: {trilha.nome}</h2>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-[var(--fg-muted)] hover:underline"
        >
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Nome da trilha</span>
          <input
            name="nome"
            required
            minLength={3}
            defaultValue={trilha.nome}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Descrição (opcional)</span>
          <textarea
            name="descricao"
            rows={2}
            defaultValue={trilha.descricao ?? ""}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Cargo associado (opcional)</span>
          <select
            name="cargo_id"
            defaultValue={trilha.cargo_id ?? ""}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">— Trilha geral —</option>
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="ativa"
            defaultChecked={trilha.ativa}
          />
          <span className="text-sm">
            <strong>Trilha ativa</strong> (visível pros colaboradores)
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
