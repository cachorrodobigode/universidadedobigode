"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { toggleAtivoManualAction, deletarManualAction, editarManualAction, type ManualState } from "./actions";
import type { Manual } from "@/lib/types/db";

const INICIAL: ManualState = {};

export function ManualRow({
  manual,
  nomePorNivel,
}: {
  manual: Manual;
  nomePorNivel: Record<number, string>;
}) {
  const [editando, setEditando] = useState(false);

  const [, toggleAction, togglePending] = useActionState(
    async (prev: ManualState, fd: FormData) => {
      const res = await toggleAtivoManualAction(prev, fd);
      if (res.ok) toast.success(res.ok);
      else if (res.erro) toast.error(res.erro);
      return res;
    },
    INICIAL,
  );

  const [, deleteAction, deletePending] = useActionState(
    async (prev: ManualState, fd: FormData) => {
      const res = await deletarManualAction(prev, fd);
      if (res.ok) toast.success(res.ok);
      else if (res.erro) toast.error(res.erro);
      return res;
    },
    INICIAL,
  );

  const [editState, editAction, editPending] = useActionState(
    async (prev: ManualState, fd: FormData) => {
      const res = await editarManualAction(prev, fd);
      if (res.ok) {
        toast.success(res.ok);
        setEditando(false);
      } else if (res.erro) {
        toast.error(res.erro);
      }
      return res;
    },
    INICIAL,
  );

  const nomeArquivo = manual.arquivo_path.replace(/^\d+-/, "");
  const nivelNome = nomePorNivel[manual.nivel_minimo] ?? `nível ${manual.nivel_minimo}`;

  const niveis = Object.entries(nomePorNivel)
    .map(([k, v]) => ({ nivel: Number(k), nome: v }))
    .filter((n) => n.nivel < 99)
    .sort((a, b) => a.nivel - b.nivel);

  if (editando) {
    return (
      <form
        action={editAction}
        className="rounded-xl bg-white border border-[var(--primary)] p-4 space-y-3"
      >
        <input type="hidden" name="id" value={manual.id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold">Título</span>
            <input
              name="titulo"
              defaultValue={manual.titulo}
              required
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold">Nível mínimo</span>
            <select
              name="nivel_minimo"
              defaultValue={manual.nivel_minimo}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              {niveis.map((n) => (
                <option key={n.nivel} value={n.nivel}>
                  {n.nome} (nível {n.nivel})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold">Descrição</span>
          <input
            name="descricao"
            defaultValue={manual.descricao ?? ""}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold">Ordem</span>
          <input
            name="ordem"
            type="number"
            defaultValue={manual.ordem}
            min="0"
            className="w-24 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        {editState.erro && (
          <p className="text-sm text-[var(--danger)]">{editState.erro}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={editPending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-fg)] disabled:opacity-60"
          >
            {editPending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--bg)]"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`rounded-xl bg-white border border-[var(--border)] p-4 flex items-start gap-4 ${
        !manual.ativo ? "opacity-60" : ""
      }`}
    >
      <div className="text-3xl shrink-0">📄</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold">{manual.titulo}</h3>
          {!manual.ativo && (
            <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
              Inativo
            </span>
          )}
          <span className="text-[10px] font-bold uppercase bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded">
            {nivelNome}+
          </span>
          <span className="text-[10px] font-bold uppercase text-[var(--fg-muted)]">
            ordem {manual.ordem}
          </span>
        </div>
        {manual.descricao && (
          <p className="text-sm text-[var(--fg-muted)] mt-1">{manual.descricao}</p>
        )}
        <p className="text-xs font-mono text-[var(--fg-muted)] mt-1 truncate">{nomeArquivo}</p>
      </div>

      <div className="flex flex-col gap-2 items-end shrink-0">
        <button
          onClick={() => setEditando(true)}
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          Editar
        </button>

        <form action={toggleAction}>
          <input type="hidden" name="id" value={manual.id} />
          <input type="hidden" name="ativo" value={String(!manual.ativo)} />
          <button
            type="submit"
            disabled={togglePending}
            className="text-xs font-semibold text-[var(--fg-muted)] hover:underline disabled:opacity-50"
          >
            {togglePending ? "..." : manual.ativo ? "Inativar" : "Reativar"}
          </button>
        </form>

        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm(`Deletar "${manual.titulo}"? Isso remove o arquivo permanentemente.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={manual.id} />
          <input type="hidden" name="arquivo_path" value={manual.arquivo_path} />
          <button
            type="submit"
            disabled={deletePending}
            className="text-xs font-semibold text-[var(--danger)] hover:underline disabled:opacity-50"
          >
            {deletePending ? "Deletando..." : "Deletar"}
          </button>
        </form>
      </div>
    </div>
  );
}
