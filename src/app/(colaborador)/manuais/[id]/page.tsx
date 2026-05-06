import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PdfProtegido } from "@/components/PdfProtegido";
import type { Manual } from "@/lib/types/db";

export default async function VisualizarManualPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("manuais")
    .select("*")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();
  const manual = data as Manual | null;

  if (!manual) notFound();

  // Verifica acesso por nível
  const meuNivel = usuario.cargo?.nivel ?? 0;
  if (manual.nivel_minimo > meuNivel) notFound();

  // Gera signed URL válida por 5 min
  const { data: urlData, error } = await admin.storage
    .from("manuais")
    .createSignedUrl(manual.arquivo_path, 300);

  if (error || !urlData?.signedUrl) {
    return (
      <div className="space-y-4">
        <Link href="/manuais" className="text-sm text-[var(--fg-muted)] hover:underline">
          ← Manuais
        </Link>
        <div className="rounded-xl bg-white border border-[var(--danger)] p-6 text-center">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="font-bold">Arquivo temporariamente indisponível.</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">Tente novamente em alguns minutos.</p>
        </div>
      </div>
    );
  }

  // Formata CPF com máscara para o watermark
  const cpfLabel = usuario.cpf
    ? usuario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/manuais" className="text-sm text-[var(--fg-muted)] hover:underline">
          ← Manuais
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-extrabold">{manual.titulo}</h1>
        {manual.descricao && (
          <p className="text-sm text-[var(--fg-muted)] mt-1">{manual.descricao}</p>
        )}
      </div>

      <PdfProtegido
        signedUrl={urlData.signedUrl}
        cpfLabel={cpfLabel}
        nome={usuario.nome}
      />

      <p className="text-[11px] text-[var(--fg-muted)] text-center">
        Este documento é de uso exclusivo de {usuario.nome}. Não compartilhe ou reproduza.
      </p>
    </div>
  );
}
