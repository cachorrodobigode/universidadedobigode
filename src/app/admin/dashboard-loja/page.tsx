import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NIVEL_CARGO, temAcessoTotalLojas } from "@/lib/auth/cargo-hierarchy";

type Membro = {
  usuario_id: string;
  nome: string;
  loja_id: string | null;
  loja_nome: string;
  cargo_nome: string;
  cargo_nivel: number;
  bigocoins_ganhos: number;
  modulos_concluidos: number;
  ativo: boolean;
};

export default async function DashboardLojaPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario || (!usuario.is_master && !usuario.is_gerente)) redirect("/trilha");

  const admin = createSupabaseAdminClient();
  const meuNivel = usuario.cargo?.nivel ?? 0;
  const acessoTotal = usuario.is_master || temAcessoTotalLojas(meuNivel);

  // Carrega todas as lojas do usuário (principal + extras)
  let minhasLojaIds: string[] | null = null;
  if (!acessoTotal) {
    const ids = new Set<string>();
    if (usuario.loja_id) ids.add(usuario.loja_id);
    const { data: extras } = await admin
      .from("usuario_lojas")
      .select("loja_id")
      .eq("usuario_id", usuario.id);
    for (const e of (extras as { loja_id: string }[] | null) ?? []) ids.add(e.loja_id);
    minhasLojaIds = Array.from(ids);
  }

  // Busca todos os colaboradores abaixo do viewer (incluindo inativos)
  let query = admin
    .from("ranking_colaboradores")
    .select(
      "usuario_id, nome, loja_id, loja_nome, cargo_nome, cargo_nivel, bigocoins_ganhos, modulos_concluidos, ativo",
    )
    .lt("cargo_nivel", acessoTotal ? 999 : meuNivel)
    .order("loja_nome")
    .order("cargo_nivel")
    .order("bigocoins_ganhos", { ascending: false });

  if (!acessoTotal) {
    if (minhasLojaIds!.length > 0) {
      query = query.in("loja_id", minhasLojaIds!);
    } else {
      query = query.eq("loja_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const { data } = await query.limit(500);
  const membros = (data ?? []) as Membro[];

  // KPIs
  const ativos = membros.filter((m) => m.ativo);
  const totalModulos = ativos.reduce((acc, m) => acc + m.modulos_concluidos, 0);
  const totalBigocoins = ativos.reduce((acc, m) => acc + m.bigocoins_ganhos, 0);

  // Agrupa por loja
  const porLoja = new Map<string, { loja_nome: string; membros: Membro[] }>();
  for (const m of membros) {
    const lojaKey = m.loja_id ?? "sem-loja";
    if (!porLoja.has(lojaKey)) porLoja.set(lojaKey, { loja_nome: m.loja_nome, membros: [] });
    porLoja.get(lojaKey)!.membros.push(m);
  }

  const escopoLabel = acessoTotal
    ? "Toda a rede"
    : `${minhasLojaIds?.length ?? 0} loja(s)`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">🏪 Equipe da loja</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          {escopoLabel} · Colaboradores abaixo de você na hierarquia.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Colaboradores ativos", valor: ativos.length, icone: "👥" },
          { label: "Módulos concluídos", valor: totalModulos, icone: "✅" },
          { label: "Bigocoins distribuídos", valor: totalBigocoins, icone: "🪙" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-[var(--border)] p-4">
            <div className="text-2xl">{c.icone}</div>
            <div className="text-2xl font-extrabold mt-1">{c.valor}</div>
            <div className="text-xs font-semibold uppercase text-[var(--fg-muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      {membros.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-3xl mb-2">👥</p>
          <p className="font-bold">Nenhum colaborador nas suas lojas ainda.</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            Cadastre colaboradores em{" "}
            <Link href="/admin/colaboradores" className="underline">
              Cadastrar colaborador
            </Link>
            .
          </p>
        </div>
      ) : (
        [...porLoja.entries()].map(([lojaKey, lojaG]) => {
          const ativos = lojaG.membros.filter((m) => m.ativo);
          const inativos = lojaG.membros.filter((m) => !m.ativo);

          return (
            <div
              key={lojaKey}
              className="rounded-xl bg-white border border-[var(--border)] overflow-hidden"
            >
              <div className="px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-bold">🏪 {lojaG.loja_nome}</h2>
                <span className="text-xs font-semibold text-[var(--fg-muted)]">
                  {ativos.length} ativo{ativos.length !== 1 ? "s" : ""}
                  {inativos.length > 0 && ` · ${inativos.length} inativo${inativos.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-4 py-2 font-bold text-xs uppercase text-[var(--fg-muted)]">Nome</th>
                      <th className="px-4 py-2 font-bold text-xs uppercase text-[var(--fg-muted)]">Cargo</th>
                      <th className="px-4 py-2 font-bold text-xs uppercase text-[var(--fg-muted)] text-right">
                        Módulos
                      </th>
                      <th className="px-4 py-2 font-bold text-xs uppercase text-[var(--fg-muted)] text-right">
                        🪙
                      </th>
                      <th className="px-4 py-2 font-bold text-xs uppercase text-[var(--fg-muted)] text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lojaG.membros.map((m) => (
                      <tr
                        key={m.usuario_id}
                        className={`border-b border-[var(--border)] last:border-0 ${
                          !m.ativo ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 font-semibold">
                          <div className="flex items-center gap-2">
                            {!m.ativo && (
                              <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                                Inativo
                              </span>
                            )}
                            {m.nome}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--fg-muted)]">{m.cargo_nome}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{m.modulos_concluidos}</td>
                        <td className="px-4 py-2.5 text-right font-extrabold">{m.bigocoins_ganhos}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Link
                            href={`/admin/usuarios/${m.usuario_id}`}
                            className="text-xs font-semibold text-[var(--primary)] hover:underline"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
