"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Input híbrido: aceita URL externa OU faz upload pro bucket 'brindes'
 * (público, sem signed URL). O valor final fica em um <input hidden>
 * de name `foto_url` que o form pai serializa.
 */
export function UploadFotoInput({
  defaultUrl,
}: {
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviar(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem maior que 5MB.");
      return;
    }
    setEnviando(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("brindes")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("brindes").getPublicUrl(path);
      setUrl(data.publicUrl);
      toast.success("Foto enviada.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="foto_url" value={url} />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-[var(--border)]" />
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
          className="text-xs font-bold rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--bg)] disabled:opacity-50"
        >
          {enviando ? "Enviando..." : url ? "📤 Trocar foto" : "📤 Enviar foto"}
        </button>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ou cole uma URL externa"
          className="flex-1 min-w-[200px] rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
        />
        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="text-xs text-[var(--danger)] hover:underline"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
