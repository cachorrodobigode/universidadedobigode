"use client";

import { useTransition } from "react";
import { resetarSenhaAction } from "@/app/admin/colaboradores/actions";
import { toast } from "sonner";

export function ResetarSenhaButton({ usuarioId, nome }: { usuarioId: string; nome: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Resetar a senha de ${nome} para o CPF? Ele(a) vai trocar no próximo login.`)) return;
        const fd = new FormData();
        fd.set("usuario_id", usuarioId);
        start(async () => {
          const r = await resetarSenhaAction({}, fd);
          if (r.erro) toast.error(r.erro);
          else toast.success(r.ok ?? "Senha resetada.");
        });
      }}
      className="text-xs font-bold rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--bg)] disabled:opacity-50"
    >
      {pending ? "Resetando..." : "Resetar senha"}
    </button>
  );
}
