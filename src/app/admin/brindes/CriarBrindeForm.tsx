"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarBrindeAction, type BrindeState } from "./actions";
import { UploadFotoInput } from "./UploadFotoInput";
import { toast } from "sonner";

const inicial: BrindeState = {};

export function CriarBrindeForm() {
  const [state, action, pending] = useActionState(criarBrindeAction, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      formRef.current?.reset();
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4">
      <h2 className="font-bold">Novo brinde</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Nome</span>
          <input
            name="nome"
            required
            minLength={2}
            placeholder="Ex.: Camiseta Cachorro do Bigode (P)"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Descrição (opcional)</span>
          <textarea
            name="descricao"
            rows={2}
            placeholder="Detalhes pro colaborador saber o que vai receber"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Custo (🪙 Bigocoins)</span>
          <input
            type="number"
            name="custo"
            min={1}
            defaultValue={50}
            required
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Estoque</span>
          <input
            type="number"
            name="estoque"
            min={0}
            defaultValue={10}
            required
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <div className="md:col-span-2 space-y-1">
          <span className="text-sm font-semibold block">Foto (opcional)</span>
          <UploadFotoInput />
          <span className="text-xs text-[var(--fg-muted)]">
            Envie um arquivo (até 5MB) ou cole a URL de uma imagem.
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Adicionar brinde"}
      </button>
    </form>
  );
}
