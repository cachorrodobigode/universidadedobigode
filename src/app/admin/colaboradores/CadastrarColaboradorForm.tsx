"use client";

import { useActionState, useMemo, useState } from "react";
import { cadastrarColaboradorAction, type CadastrarColaboradorState } from "./actions";
import { formatarCpf, cpfApenasDigitos } from "@/lib/auth/cpf-email";
import { NIVEL_CARGO } from "@/lib/auth/cargo-hierarchy";

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
  const [cargoId, setCargoId] = useState("");
  const [lojaPrincipalId, setLojaPrincipalId] = useState("");
  const [lojasExtrasIds, setLojasExtrasIds] = useState<string[]>([]);

  const cargosVisiveis = ehMaster ? cargos : cargos.filter((c) => c.nivel < NIVEL_CARGO.MASTER);
  const cargoSelecionado = useMemo(
    () => cargosVisiveis.find((c) => c.id === cargoId),
    [cargosVisiveis, cargoId],
  );
  const podeMultiLoja = (cargoSelecionado?.nivel ?? -1) >= NIVEL_CARGO.SUPERVISOR;

  function toggleLojaExtra(id: string) {
    setLojasExtrasIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

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
            value={cargoId}
            onChange={(e) => setCargoId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="" disabled>Escolhe...</option>
            {cargosVisiveis.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">
            {podeMultiLoja ? "Loja principal" : "Loja"}
          </span>
          <select
            name="loja_id"
            value={lojaPrincipalId}
            onChange={(e) => setLojaPrincipalId(e.target.value)}
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

      {podeMultiLoja && (
        <div className="rounded-lg border border-[var(--accent)] bg-[#FFFBE6] p-4">
          <p className="text-sm font-bold mb-1">Lojas adicionais (cargo elevado)</p>
          <p className="text-xs text-[var(--fg-muted)] mb-3">
            Como {cargoSelecionado?.nome} cobre múltiplas lojas, marque outras unidades além da principal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lojas
              .filter((l) => l.id !== lojaPrincipalId)
              .map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={lojasExtrasIds.includes(l.id)}
                    onChange={() => toggleLojaExtra(l.id)}
                    className="rounded"
                  />
                  <span>{l.nome}{l.cidade ? ` (${l.cidade})` : ""}</span>
                </label>
              ))}
            {lojas.filter((l) => l.id !== lojaPrincipalId).length === 0 && (
              <p className="text-xs text-[var(--fg-muted)]">Cadastre mais lojas pra poder vincular.</p>
            )}
          </div>
          <input type="hidden" name="lojas_extras" value={JSON.stringify(lojasExtrasIds)} />
        </div>
      )}

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
