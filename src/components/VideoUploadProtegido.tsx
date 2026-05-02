"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Player HTML5 pra vídeos hospedados no Supabase Storage.
 * Usa signed URL temporária. Watermark com nome+CPF por cima.
 *
 * Bloqueia: download nativo, right-click, picture-in-picture.
 * NÃO impede screen recording.
 */
export function VideoUploadProtegido({
  signedUrl,
  cpfLabel,
  nome,
  onEnded,
}: {
  signedUrl: string;
  cpfLabel: string;
  nome: string;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const v = ref.current;
    const onErr = () => setErro("Não foi possível carregar o vídeo.");
    v.addEventListener("error", onErr);
    return () => v.removeEventListener("error", onErr);
  }, []);

  if (erro) {
    return (
      <div className="rounded-xl border border-[var(--danger)] bg-red-50 p-6 text-center text-sm">
        {erro}
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black"
      style={{ aspectRatio: "16 / 9" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={ref}
        src={signedUrl}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        playsInline
        className="absolute inset-0 h-full w-full"
        onEnded={onEnded}
      >
        Seu navegador não suporta vídeo HTML5.
      </video>
      <div className="video-watermark">
        {nome} · {cpfLabel}
      </div>
    </div>
  );
}
