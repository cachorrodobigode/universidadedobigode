"use client";

import { useTransition } from "react";
import { toggleAtivoUsuarioAction } from "@/app/admin/colaboradores/actions";
import { toast } from "sonner";

export function ToggleAtivoButton({
  usuarioId,
  ativo,
  nome,
}: {
  usuarioId: string;
  ativo: boolean;
  nome: string;
}) {
  const [pending, start] = useTransition();
  const acao = ativo ? "inativar" : "reativar";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const msg = ativo
          ? `Inativar ${nome}? Ele(a) não vai mais conseguir entrar no app.`
          : `Reativar ${nome}? Ele(a) vai conseguir entrar de novo.`;
        if (!confirm(msg)) return;
        const fd = new FormData();
        fd.set("usuario_id", usuarioId);
        fd.set("ativo", String(!ativo));
        start(async () => {
          const r = await toggleAtivoUsuarioAction({}, fd);
          if (r.erro) toast.error(r.erro);
          else toast.success(r.ok ?? "Atualizado.");
        });
      }}
      className={`text-sm font-bold rounded-lg px-4 py-2 ${ativo ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-[var(--success)] hover:opacity-90 text-white"} disabled:opacity-50`}
    >
      {pending ? "..." : ativo ? "Inativar acesso" : "Reativar acesso"}
    </button>
  );
}
