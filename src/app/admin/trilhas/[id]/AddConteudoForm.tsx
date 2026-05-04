"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import {
  adicionarConteudoYoutubeAction,
  registrarConteudoUploadAction,
  type ActionState,
} from "../actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Modo = "youtube" | "video" | "imagem" | "pdf";

const ACCEPT: Record<Exclude<Modo, "youtube">, string> = {
  video: "video/mp4,video/webm,video/quicktime",
  imagem: "image/jpeg,image/png,image/webp,image/gif",
  pdf: "application/pdf",
};
const TIPO_DB: Record<Exclude<Modo, "youtube">, "video_upload" | "imagem" | "pdf"> = {
  video: "video_upload",
  imagem: "imagem",
  pdf: "pdf",
};
const LIMITE_MB: Record<Exclude<Modo, "youtube">, number> = {
  video: 200,
  imagem: 10,
  pdf: 30,
};
const ICONE: Record<Modo, string> = {
  youtube: "🔗",
  video: "🎬",
  imagem: "🖼️",
  pdf: "📄",
};
const LABEL: Record<Modo, string> = {
  youtube: "Link YouTube",
  video: "Vídeo (.mp4)",
  imagem: "Imagem",
  pdf: "PDF / Slides",
};

const inicial: ActionState = {};

export function AddConteudoForm({ moduloId, trilhaId }: { moduloId: string; trilhaId: string }) {
  const [modo, setModo] = useState<Modo>("youtube");

  return (
    <div className="mt-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] p-3">
      <div className="flex flex-wrap gap-2 mb-3">
        {(["youtube", "video", "imagem", "pdf"] as Modo[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`text-xs font-bold rounded-md px-3 py-1.5 ${
              modo === m
                ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                : "bg-white border border-[var(--border)]"
            }`}
          >
            {ICONE[m]} {LABEL[m]}
          </button>
        ))}
      </div>

      {modo === "youtube" ? (
        <FormYoutube moduloId={moduloId} trilhaId={trilhaId} />
      ) : (
        <FormUpload key={modo} moduloId={moduloId} trilhaId={trilhaId} modo={modo} />
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
        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
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

function FormUpload({
  moduloId,
  trilhaId,
  modo,
}: {
  moduloId: string;
  trilhaId: string;
  modo: Exclude<Modo, "youtube">;
}) {
  const [titulo, setTitulo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  const accept = ACCEPT[modo];
  const limiteMB = LIMITE_MB[modo];
  const tipoDb = TIPO_DB[modo];

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    if (arquivo.size > limiteMB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${limiteMB}MB.`);
      return;
    }
    setEnviando(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const safeName = arquivo.name.replace(/[^\w.-]+/g, "_");
      const path = `${moduloId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("videos") // bucket único pra todos os arquivos de módulo
        .upload(path, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type,
        });
      if (upErr) throw upErr;

      const fd = new FormData();
      fd.set("modulo_id", moduloId);
      fd.set("trilha_id", trilhaId);
      fd.set("storage_path", path);
      fd.set("tipo", tipoDb);
      fd.set("titulo", titulo);
      const r = await registrarConteudoUploadAction({}, fd);
      if (r.erro) {
        await supabase.storage.from("videos").remove([path]);
        throw new Error(r.erro);
      }
      toast.success(r.ok ?? "Enviado!");
      setArquivo(null);
      setTitulo("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
      <input
        type="file"
        accept={accept}
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
        className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-fg)] disabled:opacity-60"
      >
        {enviando ? "Enviando..." : `+ ${LABEL[modo]}`}
      </button>
      {arquivo && (
        <p className="text-xs text-[var(--fg-muted)] md:col-span-3">
          {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB · máx {limiteMB}MB
        </p>
      )}
    </form>
  );
}
