"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";
import { formatarCpf, cpfApenasDigitos } from "@/lib/auth/cpf-email";

const stateInicial: LoginState = {};

export function LoginForm() {
  const params = useSearchParams();
  const voltarPara = params.get("voltar_para") || "/trilha";
  const erroQuery = params.get("erro");
  const [state, formAction, pending] = useActionState(loginAction, stateInicial);
  const [cpf, setCpf] = useState("");

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl shadow-lg border border-[var(--border)] p-8">
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="w-20 h-20 rounded-full bg-[var(--accent)] flex items-center justify-center text-4xl">
          🎓
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--fg)]">Universidade do Bigode</h1>
        <p className="text-sm text-[var(--fg-muted)] text-center">
          Treinamento da rede Cachorro do Bigode
        </p>
      </div>

      {erroQuery === "inativo" && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          Sua conta está inativa. Procure seu gerente.
        </div>
      )}
      {state.erro && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {state.erro}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="voltar_para" value={voltarPara} />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">CPF</span>
          <input
            name="cpf"
            inputMode="numeric"
            autoComplete="username"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(cpfApenasDigitos(e.target.value).slice(0, 11)))}
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Senha</span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            placeholder="No primeiro acesso, sua senha é o seu CPF"
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            required
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60 transition"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--fg-muted)]">
        Esqueceu a senha? Procure seu gerente para resetar.
      </p>
    </div>
  );
}
