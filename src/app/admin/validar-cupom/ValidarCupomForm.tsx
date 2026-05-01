"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function ValidarCupomForm() {
  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{
    brinde: string;
    colaborador: string;
  } | null>(null);

  async function validar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setResultado(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("fn_validar_cupom", { p_codigo: codigo.trim() });
      if (error) throw error;
      const linha = Array.isArray(data) && data[0] ? data[0] : null;
      if (!linha) throw new Error("Cupom inválido.");
      setResultado({
        brinde: linha.brinde_nome,
        colaborador: linha.colaborador_nome,
      });
      toast.success("Cupom validado!");
      setCodigo("");
    } catch (err) {
      const msg = (err as Error).message;
      const traducao: Record<string, string> = {
        CUPOM_INVALIDO: "Esse código não existe.",
        CUPOM_JA_VALIDADO: "Esse cupom já foi usado.",
        CUPOM_CANCELADO: "Esse cupom foi cancelado.",
        CUPOM_EXPIRADO: "Esse cupom expirou.",
        SEM_PERMISSAO: "Você não tem permissão para validar.",
      };
      toast.error(traducao[msg] ?? msg);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={validar} className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Código do cupom</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="BIG-XXXXXXXX"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono uppercase tracking-wider"
            required
          />
        </label>
        <button
          disabled={carregando}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
        >
          {carregando ? "Validando..." : "Validar e baixar do estoque"}
        </button>
      </form>

      {resultado && (
        <div className="rounded-xl border-2 border-[var(--success)] bg-green-50 p-6">
          <h3 className="font-extrabold text-[var(--success)]">✓ Cupom válido!</h3>
          <p className="mt-2 text-sm">
            <strong>{resultado.colaborador}</strong> resgatou: <strong>{resultado.brinde}</strong>
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Entregue o brinde e dê o desconto. O sistema já registrou e baixou do estoque.
          </p>
        </div>
      )}
    </div>
  );
}
