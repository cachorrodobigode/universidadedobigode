"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { editarBrindeAction, toggleAtivoBrindeAction, type BrindeState } from "./actions";
import { UploadFotoInput } from "./UploadFotoInput";
import { toast } from "sonner";

const inicial: BrindeState = {};

type Brinde = {
  id: string;
  nome: string;
  descricao: string | null;
  custo_bigocoins: number;
  estoque: number;
  foto_url: string | null;
  ativo: boolean;
};

export function BrindeRow({ brinde }: { brinde: Brinde }) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(editarBrindeAction, inicial);
  const [pendingToggle, startToggle] = useTransition();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      setEditando(false);
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  const toggleAtivo = () => {
    const fd = new FormData();
    fd.set("id", brinde.id);
    fd.set("ativo", String(!brinde.ativo));
    startToggle(async () => {
      const r = await toggleAtivoBrindeAction({}, fd);
      if (r.erro) toast.error(r.erro);
      else toast.success(r.ok ?? "OK");
    });
  };

  return (
    <li className="py-3">
      {!editando ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {brinde.foto_url ? (
              <img src={brinde.foto_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-[var(--border)]" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-xl">🎁</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{brinde.nome}</p>
              <p className="text-xs text-[var(--fg-muted)]">
                {brinde.custo_bigocoins} 🪙 · estoque {brinde.estoque}
                {!brinde.ativo && " · INATIVO"}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setEditando(true)}
              className="text-xs font-bold rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--bg)]"
            >
              ✏️ Editar
            </button>
            <button
              onClick={toggleAtivo}
              disabled={pendingToggle}
              className="text-xs font-bold rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--bg)] disabled:opacity-50"
            >
              {pendingToggle ? "..." : brinde.ativo ? "Inativar" : "Reativar"}
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-3 bg-[#FFFBE6] border border-[var(--accent)] rounded-lg p-4">
          <input type="hidden" name="id" value={brinde.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-semibold">Nome</span>
              <input name="nome" defaultValue={brinde.nome} required className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-semibold">Descrição</span>
              <textarea name="descricao" rows={2} defaultValue={brinde.descricao ?? ""} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Custo 🪙</span>
              <input type="number" name="custo" min={1} defaultValue={brinde.custo_bigocoins} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Estoque</span>
              <input type="number" name="estoque" min={0} defaultValue={brinde.estoque} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" />
            </label>
            <div className="md:col-span-2 space-y-1">
              <span className="text-xs font-semibold block">Foto</span>
              <UploadFotoInput defaultUrl={brinde.foto_url} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="text-sm font-bold rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-2 disabled:opacity-50">
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="text-sm rounded-lg border border-[var(--border)] bg-white px-4 py-2">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
