"use client";

import { useActionState } from "react";
import { trocarSenhaAction, type TrocarSenhaState } from "./actions";

const inicial: TrocarSenhaState = {};

export default function PrimeiroAcessoPage() {
  const [state, action, pending] = useActionState(trocarSenhaAction, inicial);

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl shadow-lg border border-[var(--border)] p-8">
      <h1 className="text-2xl font-extrabold mb-1">Bem-vindo(a)!</h1>
      <p className="text-sm text-[var(--fg-muted)] mb-6">
        Pra começar, escolha uma senha nova. Use pelo menos 8 caracteres, com letras e números.
      </p>

      {state.erro && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {state.erro}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nova senha</span>
          <input
            name="nova_senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            required
            minLength={8}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Confirme a nova senha</span>
          <input
            name="confirma"
            type="password"
            autoComplete="new-password"
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            required
            minLength={8}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60 transition"
        >
          {pending ? "Salvando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}
