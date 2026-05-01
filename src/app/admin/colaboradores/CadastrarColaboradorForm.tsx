"use client";

import { useActionState, useState } from "react";
import { cadastrarColaboradorAction, type CadastrarColaboradorState } from "./actions";
import { formatarCpf, cpfApenasDigitos } from "@/lib/auth/cpf-email";

const inicial: CadastrarColaboradorState = {};

type Cargo = { id: string; nome: string; nivel: number };
type Loja = { id: string; nome: string; cidade: string | null };

export function CadastrarColaboradorForm({
  cargos,
  lojas,
  ehMaster,
}: {
  cargos: Cargo[];
  lojas: Loja[];
  ehMaster: boolean;
}) {
  const [state, action, pending] = useActionState(cadastrarColaboradorAction, inicial);
  const [cpf, setCpf] = useState("");

  // Master cadastra qualquer cargo. Gerente não pode promover a master.
  const cargosVisiveis = ehMaster ? cargos : cargos.filter((c) => c.nivel < 99);

  return (
    <form action={action} className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4">
      <h2 className="font-bold">Novo colaborador</h2>

      {state.erro && (
        <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {state.erro}
        </div>
      )}
      {state.ok && (
        <div className="rounded-lg border border-[var(--success)] bg-green-50 px-4 py-3 text-sm text-[var(--success)]">
          {state.ok}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nome completo</span>
          <input
            name="nome"
            required
            minLength={3}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">CPF</span>
          <input
            name="cpf"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(cpfApenasDigitos(e.target.value).slice(0, 11)))}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Cargo</span>
          <select
            name="cargo_id"
            required
            defaultValue=""
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="" disabled>Escolhe...</option>
            {cargosVisiveis.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Loja</span>
          <select
            name="loja_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">— Sem loja vinculada —</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}{l.cidade ? ` (${l.cidade})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}
