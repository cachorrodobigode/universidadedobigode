import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { temAcessoTotalLojas, NIVEL_CARGO } from "@/lib/auth/cargo-hierarchy";

type LinhaUser = {
  usuario_id: string;
  nome: string;
  loja_id: string | null;
  loja_nome: string;
  cargo_nome: string;
  cargo_nivel: number;
  bigocoins_ganhos: number;
  modulos_concluidos: number;
};

export default async function RelatoriosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario || (!usuario.is_master && !usuario.is_gerente)) redirect("/trilha");

  const admin = createSupabaseAdminClient();
  const meuNivel = usuario.cargo?.nivel ?? 0;
  const acessoTotal = usuario.is_master || temAcessoTotalLojas(meuNivel);

  // Lojas que o usuário enxerga
  let lojasIdsVisiveis: string[] | null = null;
  if (!acessoTotal) {
    const ids = new Set<string>();
    if (usuario.loja_id) ids.add(usuario.loja_id);
    const { data: extras } = await admin
      .from("usuario_lojas").select("loja_id").eq("usuario_id", usuario.id);
    for (const e of extras ?? []) ids.add(e.loja_id as string);
    lojasIdsVisiveis = Array.from(ids);
  }

  // Só colaboradores operacionais entram (nivel < GERENTE).
  // Gerentes, Franqueados, Franqueadoras e Master ficam fora do ranking.
  let queryRanking = admin
    .from("ranking_colaboradores")
    .select("usuario_id, nome, loja_id, loja_nome, cargo_nome, cargo_nivel, bigocoins_ganhos, modulos_concluidos")
    .eq("ativo", true)
    .lt("cargo_nivel", NIVEL_CARGO.GERENTE)
    .order("bigocoins_ganhos", { ascending: false })
    .order("modulos_concluidos", { ascending: false });

  if (lojasIdsVisiveis !== null) {
    queryRanking = lojasIdsVisiveis.length > 0
      ? queryRanking.in("loja_id", lojasIdsVisiveis)
      : queryRanking.eq("loja_id", "00000000-0000-0000-0000-000000000000"); // nada
  }
  const { data: ranking } = await queryRanking.limit(50);
  const linhas = (ranking ?? []) as LinhaUser[];

  // Métricas agregadas
  const totalColabs = linhas.length;
  const totalModulosConcluidos = linhas.reduce((acc, l) => acc + l.modulos_concluidos, 0);
  const totalBigocoins = linhas.reduce((acc, l) => acc + l.bigocoins_ganhos, 0);

  // Brindes resgatados (filtra por loja visível)
  let queryResgates = admin
    .from("resgates")
    .select("id, custo, status, usuario:usuarios(loja_id)", { count: "exact", head: false });
  const { data: resgates } = await queryResgates;
  const resgatesVisiveis = (resgates ?? []).filter((r) => {
    if (acessoTotal) return true;
    const lojaId = (r.usuario as unknown as { loja_id: string | null })?.loja_id;
    return lojaId && lojasIdsVisiveis!.includes(lojaId);
  });
  const totalResgates = resgatesVisiveis.length;
  const validados = resgatesVisiveis.filter((r) => r.status === "validado").length;

  // Ranking por loja: agrega por loja_id
  const porLojaMap = new Map<string, {
    loja_id: string; loja_nome: string;
    colabs: number; modulos: number; bigocoins: number;
  }>();
  for (const l of linhas) {
    if (!l.loja_id) continue;
    const cur = porLojaMap.get(l.loja_id) ?? {
      loja_id: l.loja_id, loja_nome: l.loja_nome, colabs: 0, modulos: 0, bigocoins: 0,
    };
    cur.colabs += 1;
    cur.modulos += l.modulos_concluidos;
    cur.bigocoins += l.bigocoins_ganhos;
    porLojaMap.set(l.loja_id, cur);
  }
  const rankingLojas = Array.from(porLojaMap.values())
    .sort((a, b) => b.bigocoins - a.bigocoins);

  // Agrupa por cargo
  const porCargo = new Map<number, LinhaUser[]>();
  for (const l of linhas) {
    if (!porCargo.has(l.cargo_nivel)) porCargo.set(l.cargo_nivel, []);
    porCargo.get(l.cargo_nivel)!.push(l);
  }
  const niveisOrdenados = [...porCargo.keys()].sort((a, b) => a - b);

  // Por loja → por cargo
  const porLojaECargo = new Map<string, { loja_nome: string; cargos: Map<number, LinhaUser[]> }>();
  for (const l of linhas) {
    if (!l.loja_id) continue;
    if (!porLojaECargo.has(l.loja_id)) {
      porLojaECargo.set(l.loja_id, { loja_nome: l.loja_nome, cargos: new Map() });
    }
    const lojaG = porLojaECargo.get(l.loja_id)!;
    if (!lojaG.cargos.has(l.cargo_nivel)) lojaG.cargos.set(l.cargo_nivel, []);
    lojaG.cargos.get(l.cargo_nivel)!.push(l);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">📊 Relatórios</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          {acessoTotal
            ? "Dados consolidados da rede inteira."
            : `Dados das suas ${lojasIdsVisiveis?.length ?? 0} loja(s).`}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Colaboradores", valor: totalColabs, icone: "👥" },
          { label: "Módulos concluídos", valor: totalModulosConcluidos, icone: "✅" },
          { label: "Bigocoins distribuídos", valor: totalBigocoins, icone: "🪙" },
          { label: `Resgates (${validados} validados)`, valor: totalResgates, icone: "🎁" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-[var(--border)] p-4">
            <div className="text-2xl">{c.icone}</div>
            <div className="text-2xl font-extrabold mt-1">{c.valor}</div>
            <div className="text-xs font-semibold uppercase text-[var(--fg-muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Top 3 da rede por cargo */}
      <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">🌟 Top 3 da rede por cargo</h2>
        {niveisOrdenados.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)] italic">
            Nenhum colaborador concluiu módulo ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {niveisOrdenados.map((nivel) => {
              const top3 = (porCargo.get(nivel) ?? []).slice(0, 3);
              const cargoNome = top3[0]?.cargo_nome ?? "—";
              return (
                <div key={nivel}>
                  <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-1.5">
                    {cargoNome}
                  </p>
                  <ol className="space-y-1">
                    {top3.map((l, i) => (
                      <li key={l.usuario_id} className="flex items-center gap-2 text-sm bg-[var(--bg)] rounded p-2">
                        <span className="font-extrabold w-6 text-center">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                        </span>
                        <span className="flex-1 truncate">{l.nome}</span>
                        <span className="text-xs text-[var(--fg-muted)] hidden sm:inline">{l.loja_nome}</span>
                        <span className="font-bold">{l.bigocoins_ganhos} 🪙</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cada loja com seus cargos */}
      {porLojaECargo.size > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">🏪 Por loja, separado por cargo</h2>
          {[...porLojaECargo.entries()].map(([lojaId, lojaG]) => {
            const niveisLoja = [...lojaG.cargos.keys()].sort((a, b) => a - b);
            return (
              <div key={lojaId} className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
                <h3 className="font-bold mb-3">{lojaG.loja_nome}</h3>
                <div className="space-y-3">
                  {niveisLoja.map((nivel) => {
                    const top5 = (lojaG.cargos.get(nivel) ?? []).slice(0, 5);
                    return (
                      <div key={nivel}>
                        <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-1">
                          {top5[0]?.cargo_nome}
                        </p>
                        <ol className="space-y-1">
                          {top5.map((l, i) => (
                            <li key={l.usuario_id} className="flex items-center gap-2 text-sm bg-[var(--bg)] rounded p-1.5">
                              <span className="font-extrabold w-6 text-center text-xs">{i + 1}º</span>
                              <span className="flex-1 truncate">{l.nome}</span>
                              <span className="text-xs text-[var(--fg-muted)]">{l.modulos_concluidos} mód</span>
                              <span className="font-bold">{l.bigocoins_ganhos} 🪙</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparativo entre lojas (placar consolidado) */}
      {(acessoTotal || (lojasIdsVisiveis && lojasIdsVisiveis.length > 1)) && rankingLojas.length > 0 && (
        <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
          <h2 className="font-bold mb-3">📊 Comparativo entre lojas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--border)]">
                  <th className="py-2 pr-4 font-bold">#</th>
                  <th className="py-2 pr-4 font-bold">Loja</th>
                  <th className="py-2 pr-4 font-bold text-right">Colabs</th>
                  <th className="py-2 pr-4 font-bold text-right">Módulos</th>
                  <th className="py-2 pr-4 font-bold text-right">🪙</th>
                </tr>
              </thead>
              <tbody>
                {rankingLojas.map((l, i) => (
                  <tr key={l.loja_id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 font-bold">{i + 1}</td>
                    <td className="py-2 pr-4">{l.loja_nome}</td>
                    <td className="py-2 pr-4 text-right">{l.colabs}</td>
                    <td className="py-2 pr-4 text-right">{l.modulos}</td>
                    <td className="py-2 pr-4 text-right font-extrabold">{l.bigocoins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--fg-muted)] text-center">
        💡 Apenas colaboradores operacionais (Atendente, Cozinha, Monitor, Líder, Supervisor) entram no ranking.
        Gerentes, Franqueados, Franqueadora e Master ficam fora porque são gestão.
      </p>
    </div>
  );
}
