import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NIVEL_CARGO } from "@/lib/auth/cargo-hierarchy";

type Linha = {
  usuario_id: string;
  nome: string;
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
}: {
  titulo: string;
  emoji: string;
  linhas: Linha[];
  destacarId?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
      <h2 className="font-bold mb-3">{emoji} {titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">Sem dados ainda.</p>
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

  // Excluí Master e Franqueadora do ranking público (são staff, não colaboradores)
  const { data } = await admin
    .from("ranking_colaboradores")
    .select("usuario_id, nome, loja_id, loja_nome, cargo_nome, cargo_nivel, bigocoins_ganhos, modulos_concluidos")
    .eq("ativo", true)
    .lt("cargo_nivel", NIVEL_CARGO.FRANQUEADORA)
    .order("bigocoins_ganhos", { ascending: false })
    .order("modulos_concluidos", { ascending: false });

  const todos = (data ?? []) as (Linha & { loja_id: string | null })[];
  const top3 = todos.slice(0, 3);
  const minhaLoja = todos.filter((l) => l.loja_id && l.loja_id === usuario.loja_id).slice(0, 10);
  const meuCargo = todos.filter((l) => l.cargo_nivel === (usuario.cargo?.nivel ?? -1)).slice(0, 10);

  // Posição do usuário no ranking geral
  const minhaPosicao = todos.findIndex((l) => l.usuario_id === usuario.id);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#FFD970] p-6 shadow-md">
        <h1 className="text-2xl font-extrabold">🏆 Ranking</h1>
        <p className="text-sm mt-1">
          {minhaPosicao >= 0
            ? `Você está em ${minhaPosicao + 1}º na rede.`
            : "Conclua um módulo pra entrar no ranking."}
        </p>
      </section>

      <Tabela titulo="Top 3 da rede" emoji="🌟" linhas={top3} destacarId={usuario.id} />

      {usuario.loja_id && (
        <Tabela
          titulo={`Minha loja${minhaLoja[0]?.loja_nome ? ` (${minhaLoja[0].loja_nome})` : ""}`}
          emoji="🏪"
          linhas={minhaLoja}
          destacarId={usuario.id}
        />
      )}

      <Tabela
        titulo={`Meu cargo (${usuario.cargo?.nome ?? "—"})`}
        emoji="👥"
        linhas={meuCargo}
        destacarId={usuario.id}
      />
    </div>
  );
}
