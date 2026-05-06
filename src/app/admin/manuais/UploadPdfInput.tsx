"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Faz upload do PDF pro bucket privado 'manuais' e guarda o path
 * em um <input hidden name="arquivo_path"> que o form pai serializa.
 */
export function UploadPdfInput({ defaultPath }: { defaultPath?: string }) {
  const [path, setPath] = useState(defaultPath ?? "");
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviar(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF maior que 50 MB.");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Selecione um arquivo PDF.");
      return;
    }
    setEnviando(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const novoCaminho = `${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("manuais")
        .upload(novoCaminho, file, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
      if (error) throw error;
      setPath(novoCaminho);
      toast.success(`PDF "${file.name}" enviado.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="arquivo_path" value={path} />

      {path && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-sm">
          <span className="text-lg">📄</span>
          <span className="flex-1 truncate font-mono text-xs">{path.split("-").slice(1).join("-")}</span>
          <button
            type="button"
            onClick={() => setPath("")}
            className="text-xs text-[var(--danger)] hover:underline"
          >
            Remover
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={enviando}
          className="text-sm font-bold rounded-lg border border-[var(--border)] bg-white px-4 py-2 hover:bg-[var(--bg)] disabled:opacity-50"
        >
          {enviando ? "Enviando PDF..." : path ? "📤 Trocar PDF" : "📤 Selecionar PDF"}
        </button>
        <span className="text-xs text-[var(--fg-muted)]">máx 50 MB</span>
      </div>
    </div>
  );
}
