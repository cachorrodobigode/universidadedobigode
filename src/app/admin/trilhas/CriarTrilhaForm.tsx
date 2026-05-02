"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { criarTrilhaAction, type ActionState } from "./actions";

const inicial: ActionState = {};

type Cargo = { id: string; nome: string; nivel: number };

export function CriarTrilhaForm({ cargos }: { cargos: Cargo[] }) {
  const [state, action, pending] = useActionState(criarTrilhaAction, inicial);
  const router = useRouter();

  // Quando criar, navega direto pra tela de detalhe pra adicionar módulo
  useEffect(() => {
    if (state.ok && state.id) router.push(`/admin/trilhas/${state.id}`);
  }, [state, router]);

  return (
    <form action={action} className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4">
      <h2 className="font-bold">Nova trilha</h2>

      {state.erro && (
        <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {state.erro}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Nome da trilha</span>
          <input
            name="nome"
            required
            minLength={3}
            placeholder="Ex.: Atendimento ao cliente"
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
          <span className="text-sm font-semibold">Cargo associado (opcional)</span>
          <select
            name="cargo_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">— Trilha geral —</option>
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <span className="text-xs text-[var(--fg-muted)]">
            Você pode deixar vazio. A visibilidade dos módulos é controlada por nível, não pela trilha.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar trilha"}
      </button>
    </form>
  );
}
