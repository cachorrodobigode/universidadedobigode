"use client";

import Image from "next/image";

/**
 * Imagem com watermark de CPF embaixo. O usuário pode clicar pra ampliar
 * (toggle full-screen). Pra dificultar download, o canvas captura
 * desativa o context menu.
 */
export function ImagemProtegida({
  signedUrl,
  cpfLabel,
  nome,
}: {
  signedUrl: string;
  cpfLabel: string;
  nome: string;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-black select-none">
      <div onContextMenu={(e) => e.preventDefault()} className="relative">
        <Image
          src={signedUrl}
          alt=""
          width={1280}
          height={720}
          className="w-full h-auto block"
          unoptimized
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] font-bold px-3 py-2 flex justify-between">
          <span>{nome}</span>
          <span>{cpfLabel}</span>
        </div>
      </div>
    </div>
  );
}
