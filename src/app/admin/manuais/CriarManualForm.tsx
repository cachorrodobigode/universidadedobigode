"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { criarManualAction, type ManualState } from "./actions";
import { UploadPdfInput } from "./UploadPdfInput";

const INICIAL: ManualState = {};

export function CriarManualForm({ nomePorNivel }: { nomePorNivel: Record<number, string> }) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ManualState, fd: FormData) => {
    const res = await criarManualAction(prev, fd);
    if (res.ok) {
      toast.success(res.ok);
      setAberto(false);
    } else if (res.erro) {
      toast.error(res.erro);
    }
    return res;
  }, INICIAL);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-xl border-2 border-dashed border-[var(--border)] bg-white w-full py-4 text-sm font-bold text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
      >
        + Novo manual
      </button>
    );
  }

  const niveis = Object.entries(nomePorNivel)
    .map(([k, v]) => ({ nivel: Number(k), nome: v }))
    .filter((n) => n.nivel < 99)
    .sort((a, b) => a.nivel - b.nivel);

  return (
    <form
      action={action}
      className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4"
    >
      <h2 className="font-bold text-lg">Novo manual</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Título *</span>
        <input
          name="titulo"
          required
          placeholder="Ex: Manual do Atendente"
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Descrição (opcional)</span>
        <textarea
          name="descricao"
          rows={2}
          placeholder="Breve descrição do conteúdo"
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm resize-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nível mínimo</span>
          <select
            name="nivel_minimo"
            defaultValue="0"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {niveis.map((n) => (
              <option key={n.nivel} value={n.nivel}>
                {n.nome} (nível {n.nivel})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Ordem</span>
          <input
            name="ordem"
            type="number"
            defaultValue="0"
            min="0"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Arquivo PDF *</span>
        <UploadPdfInput />
      </div>

      {state.erro && (
        <p className="text-sm text-[var(--danger)] font-semibold">{state.erro}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar manual"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--bg)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
