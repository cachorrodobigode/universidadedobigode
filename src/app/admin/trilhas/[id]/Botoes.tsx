"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletarTrilhaAction, deletarModuloAction, deletarConteudoAction } from "../actions";

export function DeletarTrilhaButton({ id, nome }: { id: string; nome: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Apagar a trilha "${nome}" e todos os módulos dentro? Não dá pra desfazer.`)) return;
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          const r = await deletarTrilhaAction({}, fd);
          if (r.erro) toast.error(r.erro);
          else {
            toast.success(r.ok ?? "Removida.");
            router.push("/admin/trilhas");
          }
        });
      }}
      className="text-xs font-bold rounded-md border border-[var(--danger)] text-[var(--danger)] bg-white px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
    >
      {pending ? "Apagando..." : "Apagar trilha"}
    </button>
  );
}

export function DeletarModuloButton({
  id,
  trilhaId,
  titulo,
}: {
  id: string;
  trilhaId: string;
  titulo: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Apagar o módulo "${titulo}"?`)) return;
        const fd = new FormData();
        fd.set("id", id);
        fd.set("trilha_id", trilhaId);
        start(async () => {
          const r = await deletarModuloAction({}, fd);
          if (r.erro) toast.error(r.erro);
          else toast.success(r.ok ?? "Removido.");
        });
      }}
      className="text-xs font-bold rounded-md border border-[var(--danger)] text-[var(--danger)] bg-white px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
    >
      {pending ? "..." : "Apagar"}
    </button>
  );
}

export function DeletarConteudoButton({ id, trilhaId }: { id: string; trilhaId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remover esse vídeo do módulo?")) return;
        const fd = new FormData();
        fd.set("id", id);
        fd.set("trilha_id", trilhaId);
        start(async () => {
          const r = await deletarConteudoAction({}, fd);
          if (r.erro) toast.error(r.erro);
          else toast.success(r.ok ?? "Removido.");
        });
      }}
      className="text-xs rounded-md border border-[var(--border)] bg-white px-2 py-1 hover:bg-red-50 hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
    >
      {pending ? "..." : "✕"}
    </button>
  );
}
