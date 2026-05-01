"use client";

import { useActionState } from "react";
import { criarLojaAction, type LojaState } from "./actions";

const inicial: LojaState = {};

export function LojaForm() {
  const [state, action, pending] = useActionState(criarLojaAction, inicial);
  return (
    <form action={action} className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4">
      <h2 className="font-bold">Nova loja</h2>

      {state.erro && (
        <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{state.erro}</div>
      )}
      {state.ok && (
        <div className="rounded-lg border border-[var(--success)] bg-green-50 px-4 py-3 text-sm text-[var(--success)]">{state.ok}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nome da loja</span>
          <input name="nome" required minLength={2} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Cidade (opcional)</span>
          <input name="cidade" className="rounded-lg border border-[var(--border)] bg-white px-3 py-2" />
        </label>
      </div>

      <button type="submit" disabled={pending} className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60">
        {pending ? "Salvando..." : "Adicionar loja"}
      </button>
    </form>
  );
}
