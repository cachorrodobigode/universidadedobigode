import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_POR_NIVEL } from "@/lib/auth/cargo-hierarchy";
import type { Manual } from "@/lib/types/db";

export default async function ManuaisPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createSupabaseAdminClient();
  const meuNivel = usuario.cargo?.nivel ?? 0;

  const { data } = await admin
    .from("manuais")
    .select("id, titulo, descricao, nivel_minimo, ordem, ativo")
    .eq("ativo", true)
    .lte("nivel_minimo", meuNivel)
    .order("ordem")
    .order("criado_em");
  const manuais = (data ?? []) as Pick<Manual, "id" | "titulo" | "descricao" | "nivel_minimo" | "ordem" | "ativo">[];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[#A0522D] p-6 shadow-md text-[var(--secondary-fg)]">
        <h1 className="text-2xl font-extrabold">📄 Manuais</h1>
        <p className="text-sm mt-1 opacity-90">
          Documentos corporativos disponíveis para o seu cargo.
        </p>
      </section>

      {manuais.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-4xl mb-2">📄</p>
          <h3 className="font-bold text-lg">Nenhum manual disponível</h3>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            A gestora ainda não publicou manuais para o seu cargo. Volte em breve!
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {manuais.map((m) => (
            <Link
              key={m.id}
              href={`/manuais/${m.id}`}
              className="block rounded-xl bg-white border border-[var(--border)] p-4 hover:shadow-md hover:border-[var(--primary)] transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--secondary)] text-2xl shrink-0">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight">{m.titulo}</h3>
                  {m.descricao && (
                    <p className="text-sm text-[var(--fg-muted)] mt-1 line-clamp-2">{m.descricao}</p>
                  )}
                  <p className="text-xs font-semibold text-[var(--fg-muted)] mt-2">
                    {NOME_POR_NIVEL[m.nivel_minimo] ?? `nível ${m.nivel_minimo}`}+
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
