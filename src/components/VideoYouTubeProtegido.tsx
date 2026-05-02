"use client";

import { youtubeEmbedUrl } from "@/lib/video/youtube";

/**
 * Player de vídeo YouTube embed com watermark visível por cima.
 *
 * IMPORTANTE: o watermark é CSS overlay — não impede screenshot/screen-recording,
 * mas IDENTIFICA o vazador (o nome/CPF aparece em todas as gravações).
 */
export function VideoYouTubeProtegido({
  videoId,
  cpfLabel,
  nome,
}: {
  videoId: string;
  cpfLabel: string; // ex: "975.118.890-34"
  nome: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black"
      style={{ aspectRatio: "16 / 9" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        src={youtubeEmbedUrl(videoId)}
        title="Vídeo do treinamento"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Watermark fixa no canto inferior */}
      <div className="video-watermark">
        {nome} · {cpfLabel}
      </div>
      {/* Camada bloqueando texto/right-click sobre o player */}
      <div
        className="pointer-events-none absolute top-0 right-0 left-0 h-10"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)" }}
        aria-hidden
      />
    </div>
  );
}
