"use client";

/**
 * Visualizador básico de PDF — usa iframe nativo do browser. O CPF do
 * colaborador aparece sobreposto no topo do iframe (não pode ser removido
 * sem editar o DOM).
 *
 * Limitação conhecida: Chrome PDF viewer permite download via botão.
 * Pra evitar, futuramente migrar pra react-pdf renderizando em canvas.
 * Por ora a watermark + signed URL curto (5min) já desencorajam.
 */
export function PdfProtegido({
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
      <div className="absolute top-0 inset-x-0 z-10 bg-black/70 text-white text-[11px] font-bold px-3 py-1.5 flex justify-between pointer-events-none">
        <span>{nome}</span>
        <span>{cpfLabel}</span>
      </div>
      <iframe
        src={`${signedUrl}#toolbar=0&navpanes=0`}
        className="w-full h-[70vh] block"
        title="PDF"
      />
    </div>
  );
}
