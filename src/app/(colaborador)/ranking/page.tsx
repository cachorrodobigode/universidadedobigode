import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NIVEL_CARGO, temAcessoTotalLojas } from "@/lib/auth/cargo-hierarchy";

type Linha = {
  usuario_id: string;
  nome: string;
  loja_id: string | null;
  loja_nome: string;
  cargo_nome: string;
  cargo_nivel: number;
  bigocoins_ganhos: number;
  modulos_concluidos: number;
};

function Tabela({
  titulo,
  emoji,
  linhas,
  destacarId,
  vazioMsg = "Sem dados ainda.",
}: {
  titulo: string;
  emoji: string;
  linhas: Linha[];
  destacarId?: string;
  vazioMsg?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
      <h2 className="font-bold mb-3">
        {emoji} {titulo}
      </h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] italic">{vazioMsg}</p>
      ) : (
        <ol className="space-y-2">
          {linhas.map((l, i) => {
            const eu = l.usuario_id === destacarId;
            const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
            return (
              <li
                key={l.usuario_id}
                className={`flex items-center gap-3 rounded-lg p-2.5 ${
                  eu ? "bg-[var(--accent)] border-2 border-[var(--secondary)]" : "bg-[var(--bg)]"
                }`}
              >
                <span className="text-lg w-8 text-center font-extrabold">{medalha}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {l.nome}
                    {eu && " (você)"}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)] truncate">
                    {l.cargo_nome} · {l.loja_nome}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold">{l.bigocoins_ganhos} 🪙</p>
                  <p className="text-xs text-[var(--fg-muted)]">{l.modulos_concluidos} módulos</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default async function RankingPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createSupabaseAdminClient();
  const meuNivel = usuario.cargo?.nivel ?? 0;
  const ehGestao = meuNivel >= NIVEL_CARGO.GERENTE;
  const acessoTotal = usuario.is_master || temAcessoTotalLojas(meuNivel);

  // Gerente/Franqueado: carrega todas as lojas do usuário (principal + extras)
  let minhasLojaIds: string[] | null = null;
  if (ehGestao && !acessoTotal) {
    const ids = new Set<string>();
    if (usuario.loja_id) ids.add(usuario.loja_id);
    const { data: extras } = await admin
      .from("usuario_lojas")
      .select("loja_id")
      .eq("usuario_id", usuario.id);
    for (const e of (extras as { loja_id: string }[] | null) ?? []) ids.add(e.loja_id);
    minhasLojaIds = Array.from(ids);
  }

  // Query base
  let query = admin
    .from("ranking_colaboradores")
    .select(
      "usuario_id, nome, loja_id, loja_nome, cargo_nome, cargo_nivel, bigocoins_ganhos, modulos_concluidos",
    )
    .eq("ativo", true)
    .order("bigocoins_ganhos", { ascending: false })
    .order("modulos_concluidos", { ascending: false });

  if (ehGestao) {
    if (!acessoTotal) {
      // Gerente (5) e Franqueado (6): vê apenas quem está hierarquicamente abaixo, nas suas lojas
      query = query.lt("cargo_nivel", meuNivel);
      if (minhasLojaIds!.length > 0) {
        query = query.in("loja_id", minhasLojaIds!);
      } else {
        // Sem loja associada — mostra vazio
        query = query.eq("loja_id", "00000000-0000-0000-0000-000000000000");
      }
    }
    // Franqueadora (7) e Master (99): sem filtros → todos os cargos, todas as lojas
  } else {
    // Colaborador operacional: só vê nivel < GERENTE (os participantes do "game")
    query = query.lt("cargo_nivel", NIVEL_CARGO.GERENTE);
  }

  const { data } = await query.limit(200);
  const todos = (data ?? []) as Linha[];

  const porCargo = new Map<number, Linha[]>();
  for (const l of todos) {
    if (!porCargo.has(l.cargo_nivel)) porCargo.set(l.cargo_nivel, []);
    porCargo.get(l.cargo_nivel)!.push(l);
  }
  const niveisOrdenados = [...porCargo.keys()].sort((a, b) => a - b);

  const subtitulo = acessoTotal
    ? "Todos os cargos e todas as lojas da rede."
    : ehGestao
      ? `Colaboradores das suas lojas abaixo de você na hierarquia.`
      : "Compare seu desempenho com a equipe e a rede.";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#FFD970] p-6 shadow-md">
        <h1 className="text-2xl font-extrabold">🏆 Ranking</h1>
        <p className="text-sm mt-1">{subtitulo}</p>
      </section>

      {ehGestao ? (
        <GestaoView
          usuarioId={usuario.id}
          todos={todos}
          niveisOrdenados={niveisOrdenados}
          porCargo={porCargo}
        />
      ) : (
        <ColaboradorView
          usuarioId={usuario.id}
          meuNivel={meuNivel}
          minhaLojaId={usuario.loja_id}
          porCargo={porCargo}
        />
      )}
    </div>
  );
}

// ── Colaborador operacional (Atendente → Supervisor) ──────────────────────────

function ColaboradorView({
  usuarioId,
  meuNivel,
  minhaLojaId,
  porCargo,
}: {
  usuarioId: string;
  meuNivel: number;
  minhaLojaId: string | null;
  porCargo: Map<number, Linha[]>;
}) {
  const meuGrupo = porCargo.get(meuNivel) ?? [];
  const minhaLojaMeuCargo = minhaLojaId
    ? meuGrupo.filter((l) => l.loja_id === minhaLojaId).slice(0, 10)
    : [];
  const top3RedeMeuCargo = meuGrupo.slice(0, 3);
  const cargoNome = meuGrupo[0]?.cargo_nome ?? "—";

  return (
    <>
      {minhaLojaId && (
        <Tabela
          titulo={`Minha loja — ${cargoNome}`}
          emoji="🏪"
          linhas={minhaLojaMeuCargo}
          destacarId={usuarioId}
          vazioMsg="Você ainda é o único do seu cargo nessa loja (ou ninguém ganhou Bigocoins ainda)."
        />
      )}
      <Tabela
        titulo={`Top 3 da rede — ${cargoNome}`}
        emoji="🌟"
        linhas={top3RedeMeuCargo}
        destacarId={usuarioId}
        vazioMsg="Conclua um módulo pra entrar no ranking."
      />
    </>
  );
}

// ── Gestão (Gerente → Master) ─────────────────────────────────────────────────

function GestaoView({
  usuarioId,
  todos,
  niveisOrdenados,
  porCargo,
}: {
  usuarioId: string;
  todos: Linha[];
  niveisOrdenados: number[];
  porCargo: Map<number, Linha[]>;
}) {
  // Deriva as lojas visíveis diretamente dos dados já filtrados pela query
  const porLoja = new Map<string, { loja_nome: string; cargos: Map<number, Linha[]> }>();
  for (const l of todos) {
    if (!l.loja_id) continue;
    if (!porLoja.has(l.loja_id)) porLoja.set(l.loja_id, { loja_nome: l.loja_nome, cargos: new Map() });
    const lojaG = porLoja.get(l.loja_id)!;
    if (!lojaG.cargos.has(l.cargo_nivel)) lojaG.cargos.set(l.cargo_nivel, []);
    lojaG.cargos.get(l.cargo_nivel)!.push(l);
  }

  return (
    <>
      {/* Top 3 da rede por cargo */}
      <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">🌟 Top 3 da rede por cargo</h2>
        {niveisOrdenados.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)] italic">
            Ninguém ganhou Bigocoins ainda. Quando colaboradores concluírem módulos eles aparecem aqui.
          </p>
        ) : (
          <div className="space-y-4">
            {niveisOrdenados.map((nivel) => {
              const top3 = (porCargo.get(nivel) ?? []).slice(0, 3);
              const cargoNome = top3[0]?.cargo_nome ?? "—";
              return (
                <div key={nivel}>
                  <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-1.5">{cargoNome}</p>
                  <ol className="space-y-1">
                    {top3.map((l, i) => (
                      <li
                        key={l.usuario_id}
                        className={`flex items-center gap-2 text-sm rounded p-2 ${
                          l.usuario_id === usuarioId ? "bg-[var(--accent)]" : "bg-[var(--bg)]"
                        }`}
                      >
                        <span className="font-extrabold">
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

      {/* Por loja, separado por cargo */}
      {[...porLoja.entries()].map(([lojaId, lojaG]) => {
        const niveisNaLoja = [...lojaG.cargos.keys()].sort((a, b) => a - b);
        return (
          <div key={lojaId} className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
            <h2 className="font-bold mb-3">🏪 {lojaG.loja_nome}</h2>
            {niveisNaLoja.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)] italic">
                Sem colaboradores com Bigocoins nessa loja ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {niveisNaLoja.map((nivel) => {
                  const linhasCargo = (lojaG.cargos.get(nivel) ?? []).slice(0, 5);
                  return (
                    <div key={nivel}>
                      <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-1.5">
                        {linhasCargo[0]?.cargo_nome}
                      </p>
                      <ol className="space-y-1">
                        {linhasCargo.map((l, i) => (
                          <li
                            key={l.usuario_id}
                            className={`flex items-center gap-2 text-sm rounded p-2 ${
                              l.usuario_id === usuarioId ? "bg-[var(--accent)]" : "bg-[var(--bg)]"
                            }`}
                          >
                            <span className="font-extrabold w-6 text-center">{i + 1}º</span>
                            <span className="flex-1 truncate">{l.nome}</span>
                            <span className="text-xs text-[var(--fg-muted)]">
                              {l.modulos_concluidos} mód
                            </span>
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
        );
      })}

      {todos.length === 0 && (
        <div className="rounded-xl bg-white border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="font-bold">Nenhum colaborador no ranking ainda.</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            Quando as equipes concluírem módulos, elas aparecem aqui.
          </p>
        </div>
      )}
    </>
  );
}
