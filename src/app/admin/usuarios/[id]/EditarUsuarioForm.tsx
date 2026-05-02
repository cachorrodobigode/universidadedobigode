"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { editarUsuarioAction, type EditarUsuarioState } from "@/app/admin/colaboradores/actions";
import { NIVEL_CARGO } from "@/lib/auth/cargo-hierarchy";
import { toast } from "sonner";

const inicial: EditarUsuarioState = {};

type Cargo = { id: string; nome: string; nivel: number };
type Loja = { id: string; nome: string; cidade: string | null };

type Alvo = {
  id: string;
  nome: string;
  cargo_id: string;
  loja_id: string | null;
  lojas_extras: string[];
};

export function EditarUsuarioForm({
  alvo,
  cargos,
  lojas,
  ehMaster,
  bloqueado,
}: {
  alvo: Alvo;
  cargos: Cargo[];
  lojas: Loja[];
  ehMaster: boolean;
  bloqueado: boolean;
}) {
  const [state, action, pending] = useActionState(editarUsuarioAction, inicial);
  const [nome, setNome] = useState(alvo.nome);
  const [cargoId, setCargoId] = useState(alvo.cargo_id);
  const [lojaPrincipalId, setLojaPrincipalId] = useState(alvo.loja_id ?? "");
  const [lojasExtrasIds, setLojasExtrasIds] = useState<string[]>(alvo.lojas_extras);

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    if (state.erro) toast.error(state.erro);
  }, [state]);

  const cargoSelecionado = useMemo(
    () => cargos.find((c) => c.id === cargoId),
    [cargos, cargoId],
  );
  const podeMultiLoja = (cargoSelecionado?.nivel ?? -1) >= NIVEL_CARGO.SUPERVISOR;

  function toggleLojaExtra(id: string) {
    setLojasExtrasIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  if (bloqueado) return null;

  return (
    <form action={action} className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4">
      <h2 className="font-bold">Editar dados</h2>

      <input type="hidden" name="usuario_id" value={alvo.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-semibold">Nome completo</span>
          <input
            name="nome"
            required
            minLength={3}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
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
            {cargos.length === 0 ? (
              <option value="" disabled>Nenhum cargo disponível</option>
            ) : (
              cargos.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))
            )}
          </select>
          {!ehMaster && (
            <span className="text-xs text-[var(--fg-muted)]">
              Você só pode atribuir cargos abaixo do seu.
            </span>
          )}
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
            <option value="">— Sem loja —</option>
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
          <p className="text-sm font-bold mb-1">Lojas adicionais</p>
          <p className="text-xs text-[var(--fg-muted)] mb-3">
            Marque outras unidades que essa pessoa cobre (além da principal).
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
          </div>
          <input type="hidden" name="lojas_extras" value={JSON.stringify(lojasExtrasIds)} />
        </div>
      )}

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
