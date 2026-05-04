import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NIVEL_CARGO } from "@/lib/auth/cargo-hierarchy";

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
                    {l.nome}{eu && " (você)"}
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

  // Só entram no ranking colaboradores com nivel < GERENTE (Atendente, Cozinha,
  // Monitor, Líder, Supervisor). Gerente, Franqueado, Franqueadora e Master
  // são staff e ficam fora.
  const { data } = await admin
    .from("ranking_colaboradores")
    .select("usuario_id, nome, loja_id, loja_nome, cargo_nome, cargo_nivel, bigocoins_ganhos, modulos_concluidos")
    .eq("ativo", true)
    .lt("cargo_nivel", NIVEL_CARGO.GERENTE)
    .order("bigocoins_ganhos", { ascending: false })
    .order("modulos_concluidos", { ascending: false });

  const todos = (data ?? []) as Linha[];
  const meuNivel = usuario.cargo?.nivel ?? -1;
  const ehGestao = meuNivel >= NIVEL_CARGO.GERENTE; // Gerente/Franqueado/Franqueadora/Master

  // Agrupa por cargo (nivel → linhas)
  const porCargo = new Map<number, Linha[]>();
  for (const l of todos) {
    if (!porCargo.has(l.cargo_nivel)) porCargo.set(l.cargo_nivel, []);
    porCargo.get(l.cargo_nivel)!.push(l);
  }
  const niveisOrdenados = [...porCargo.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#FFD970] p-6 shadow-md">
        <h1 className="text-2xl font-extrabold">🏆 Ranking</h1>
        <p className="text-sm mt-1">
          {ehGestao
            ? "Acompanhe os colaboradores das suas lojas e os melhores da rede."
            : "Compare seu desempenho com a equipe e a rede."}
        </p>
      </section>

      {ehGestao ? (
        <GestaoView
          usuario={usuario}
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

function GestaoView({
  usuario,
  todos,
  niveisOrdenados,
  porCargo,
}: {
  usuario: {
    id: string;
    is_master: boolean;
    loja_id: string | null;
    cargo?: { nome: string; nivel: number } | null;
  };
  todos: Linha[];
  niveisOrdenados: number[];
  porCargo: Map<number, Linha[]>;
}) {
  // Master e Franqueadora não têm "minha loja" focada.
  // Gerente/Franqueado focam nas suas lojas (principal + extras carregadas).
  const meuNivel = usuario.cargo?.nivel ?? 0;
  const escopoLojaUnica = meuNivel === NIVEL_CARGO.GERENTE; // Gerente foca na sua loja
  const escopoMultiLoja = meuNivel === NIVEL_CARGO.FRANQUEADO; // Franqueado pode ter várias

  // Pra Gerente/Franqueado: agrupa por loja (apenas as suas)
  // Pra Master/Franqueadora: mostra ranking por loja (todas)
  const lojaIdsConhecidas = new Set(todos.map((l) => l.loja_id).filter(Boolean) as string[]);
  const minhasLojaIds = new Set<string>();
  if (escopoLojaUnica && usuario.loja_id) minhasLojaIds.add(usuario.loja_id);

  // Sem fetch extra de usuario_lojas: mostramos visão "minha loja" (principal),
  // e o relatório /admin/relatorios cobre o caso multi-loja completo.

  const lojasParaMostrar =
    escopoLojaUnica
      ? [...minhasLojaIds]
      : escopoMultiLoja
        ? (usuario.loja_id ? [usuario.loja_id] : [])
        : [...lojaIdsConhecidas]; // master/franqueadora vê todas

  return (
    <>
      {/* Top 3 da rede por cargo */}
      <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">🌟 Top 3 da rede por cargo</h2>
        <div className="space-y-4">
          {niveisOrdenados.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)] italic">
              Ninguém ganhou Bigocoins ainda. Quando colaboradores começarem a concluir módulos, eles aparecem aqui.
            </p>
          ) : (
            niveisOrdenados.map((nivel) => {
              const linhas = porCargo.get(nivel) ?? [];
              const top3 = linhas.slice(0, 3);
              const cargoNome = linhas[0]?.cargo_nome ?? "—";
              return (
                <div key={nivel}>
                  <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-1.5">
                    {cargoNome}
                  </p>
                  {top3.length === 0 ? (
                    <p className="text-xs text-[var(--fg-muted)] italic">Sem colaboradores ainda.</p>
                  ) : (
                    <ol className="space-y-1">
                      {top3.map((l, i) => (
                        <li key={l.usuario_id} className="flex items-center gap-2 text-sm bg-[var(--bg)] rounded p-2">
                          <span className="font-extrabold">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                          <span className="flex-1 truncate">{l.nome}</span>
                          <span className="text-xs text-[var(--fg-muted)] hidden sm:inline">{l.loja_nome}</span>
                          <span className="font-bold">{l.bigocoins_ganhos} 🪙</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Por loja, separado por cargo */}
      {lojasParaMostrar.length === 0 ? null : (
        lojasParaMostrar.map((lojaId) => {
          const daLoja = todos.filter((l) => l.loja_id === lojaId);
          const lojaNome = daLoja[0]?.loja_nome ?? "(loja)";
          const niveisNaLoja = [...new Set(daLoja.map((l) => l.cargo_nivel))].sort((a, b) => a - b);
          return (
            <div key={lojaId} className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
              <h2 className="font-bold mb-3">🏪 {lojaNome}</h2>
              {niveisNaLoja.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)] italic">
                  Sem colaboradores com Bigocoins nessa loja ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {niveisNaLoja.map((nivel) => {
                    const linhasCargo = daLoja.filter((l) => l.cargo_nivel === nivel).slice(0, 5);
                    return (
                      <div key={nivel}>
                        <p className="text-xs font-bold uppercase text-[var(--fg-muted)] mb-1.5">
                          {linhasCargo[0]?.cargo_nome}
                        </p>
                        <ol className="space-y-1">
                          {linhasCargo.map((l, i) => (
                            <li key={l.usuario_id} className="flex items-center gap-2 text-sm bg-[var(--bg)] rounded p-2">
                              <span className="font-extrabold w-6 text-center">{i + 1}º</span>
                              <span className="flex-1 truncate">{l.nome}</span>
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
        })
      )}
    </>
  );
}
