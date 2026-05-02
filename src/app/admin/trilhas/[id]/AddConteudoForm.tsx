"use client";

import { useState } from "react";
import { useActionState, useEffect, useRef } from "react";
import { adicionarConteudoYoutubeAction, registrarConteudoUploadAction, type ActionState } from "../actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Modo = "youtube" | "upload";

const inicial: ActionState = {};

export function AddConteudoForm({ moduloId, trilhaId }: { moduloId: string; trilhaId: string }) {
  const [modo, setModo] = useState<Modo>("youtube");

  return (
    <div className="mt-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] p-3">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setModo("youtube")}
          className={`text-xs font-bold rounded-md px-3 py-1.5 ${
            modo === "youtube"
              ? "bg-[var(--primary)] text-[var(--primary-fg)]"
              : "bg-white border border-[var(--border)]"
          }`}
        >
          🔗 Link YouTube
        </button>
        <button
          type="button"
          onClick={() => setModo("upload")}
          className={`text-xs font-bold rounded-md px-3 py-1.5 ${
            modo === "upload"
              ? "bg-[var(--primary)] text-[var(--primary-fg)]"
              : "bg-white border border-[var(--border)]"
          }`}
        >
          📤 Enviar arquivo
        </button>
      </div>

      {modo === "youtube" ? (
        <FormYoutube moduloId={moduloId} trilhaId={trilhaId} />
      ) : (
        <FormUpload moduloId={moduloId} trilhaId={trilhaId} />
      )}
    </div>
  );
}

function FormYoutube({ moduloId, trilhaId }: { moduloId: string; trilhaId: string }) {
  const [state, action, pending] = useActionState(adicionarConteudoYoutubeAction, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      formRef.current?.reset();
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
      <input type="hidden" name="modulo_id" value={moduloId} />
      <input type="hidden" name="trilha_id" value={trilhaId} />

      <input
        name="url"
        required
        placeholder="https://youtu.be/... ou https://youtube.com/watch?v=..."
        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
      />
      <input
        name="titulo"
        placeholder="Título (opcional)"
        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "..." : "+ YouTube"}
      </button>
    </form>
  );
}

function FormUpload({ moduloId, trilhaId }: { moduloId: string; trilhaId: string }) {
  const [titulo, setTitulo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    if (arquivo.size > 209715200) {
      toast.error("Arquivo maior que 200MB. Use vídeo menor ou link do YouTube.");
      return;
    }
    setEnviando(true);
    setProgresso(0);
    try {
      const supabase = createSupabaseBrowserClient();
      // Path único: modulo_id/timestamp-nome
      const safeName = arquivo.name.replace(/[^\w.-]+/g, "_");
      const path = `${moduloId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("videos")
        .upload(path, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type,
        });

      if (upErr) throw upErr;
      setProgresso(100);

      const fd = new FormData();
      fd.set("modulo_id", moduloId);
      fd.set("trilha_id", trilhaId);
      fd.set("storage_path", path);
      fd.set("titulo", titulo);
      const r = await registrarConteudoUploadAction({}, fd);
      if (r.erro) {
        // rollback do upload se registro falhou
        await supabase.storage.from("videos").remove([path]);
        throw new Error(r.erro);
      }
      toast.success(r.ok ?? "Vídeo enviado!");
      setArquivo(null);
      setTitulo("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        className="text-sm rounded-md border border-[var(--border)] bg-white px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-[var(--accent)] file:text-[var(--accent-fg)] file:font-bold file:px-2 file:py-1 file:cursor-pointer"
        required
      />
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={enviando || !arquivo}
        className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-60"
      >
        {enviando ? `Enviando${progresso !== null ? ` ${progresso}%` : "..."}` : "+ Enviar"}
      </button>
      {arquivo && (
        <p className="text-xs text-[var(--fg-muted)] md:col-span-3">
          {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB · máx 200MB
        </p>
      )}
    </form>
  );
}
