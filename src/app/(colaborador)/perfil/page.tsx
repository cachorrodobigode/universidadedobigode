import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatarCpf } from "@/lib/auth/cpf-email";
import { TrocarSenhaCard } from "./TrocarSenhaCard";

export default async function PerfilPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createSupabaseAdminClient();

  const [
    { data: saldo },
    { data: extrato },
    { data: progressoConcluido, count: totalConcluidos },
    { data: meusResgates },
  ] = await Promise.all([
    admin.from("saldo_bigocoins").select("saldo").eq("usuario_id", usuario.id).maybeSingle(),
    admin
      .from("bigocoins_extrato")
      .select("id, valor, motivo, criado_em, modulo:modulos(titulo)")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false })
      .limit(20),
    admin
      .from("progresso")
      .select("modulo_id, concluido_em, modulo:modulos(titulo)", { count: "exact" })
      .eq("usuario_id", usuario.id)
      .eq("status", "concluido")
      .order("concluido_em", { ascending: false })
      .limit(10),
    admin
      .from("resgates")
      .select("id, codigo_unico, status, custo, criado_em, brinde:brindes(nome)")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false })
      .limit(10),
  ]);

  const saldoAtual = (saldo?.saldo as number | undefined) ?? 0;
  const totalGanho = (extrato ?? [])
    .filter((e) => (e.valor as number) > 0)
    .reduce((acc, e) => acc + (e.valor as number), 0);

  const iniciais = usuario.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      {/* Header com avatar e dados */}
      <section className="rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#A11A2D] p-6 text-[var(--primary-fg)] shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center text-2xl font-extrabold shrink-0">
            {iniciais || "🐾"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold truncate">{usuario.nome}</h1>
            <p className="text-sm opacity-90">
              {usuario.cargo?.nome ?? "—"}{usuario.loja?.nome && ` · ${usuario.loja.nome}`}
            </p>
            <p className="text-xs opacity-75 font-mono mt-1">{formatarCpf(usuario.cpf)}</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Saldo agora", valor: saldoAtual, icone: "🪙" },
          { label: "Total ganho", valor: totalGanho, icone: "📈" },
          { label: "Módulos", valor: totalConcluidos ?? 0, icone: "✅" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-[var(--border)] p-3 text-center">
            <div className="text-2xl">{c.icone}</div>
            <div className="text-xl font-extrabold mt-1">{c.valor}</div>
            <div className="text-[10px] font-semibold uppercase text-[var(--fg-muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Trocar senha */}
      <TrocarSenhaCard />

      {/* Histórico de Bigocoins */}
      <section className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">📒 Histórico de Bigocoins</h2>
        {(extrato ?? []).length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)] italic">
            Você ainda não ganhou ou gastou Bigocoins. Conclua um módulo pra começar!
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {extrato!.map((e) => {
              const valor = e.valor as number;
              const positivo = valor > 0;
              const moduloNome = (e.modulo as unknown as { titulo?: string })?.titulo;
              const data = new Date(e.criado_em as string).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "2-digit",
              });
              const motivos: Record<string, string> = {
                modulo_concluido: "Módulo concluído",
                resgate_brinde: "Resgate de brinde",
                ajuste_master: "Ajuste pela gestora",
                inicial_teste: "Saldo inicial",
              };
              return (
                <li key={e.id as string} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {motivos[e.motivo as string] ?? (e.motivo as string)}
                    </p>
                    {moduloNome && (
                      <p className="text-xs text-[var(--fg-muted)] truncate">{moduloNome}</p>
                    )}
                    <p className="text-[10px] text-[var(--fg-muted)]">{data}</p>
                  </div>
                  <span className={`font-extrabold text-sm ${positivo ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                    {positivo ? "+" : ""}{valor} 🪙
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Módulos concluídos */}
      <section className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">✅ Módulos concluídos ({totalConcluidos ?? 0})</h2>
        {(progressoConcluido ?? []).length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)] italic">
            Você ainda não concluiu nenhum módulo.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {progressoConcluido!.map((p) => {
              const titulo = (p.modulo as unknown as { titulo?: string })?.titulo ?? "—";
              const data = p.concluido_em
                ? new Date(p.concluido_em as string).toLocaleDateString("pt-BR")
                : "—";
              return (
                <li key={p.modulo_id as string} className="py-2 flex items-center justify-between text-sm">
                  <span className="truncate">{titulo}</span>
                  <span className="text-xs text-[var(--fg-muted)]">{data}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Meus cupons */}
      <section className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6">
        <h2 className="font-bold mb-3">🎁 Meus cupons</h2>
        {(meusResgates ?? []).length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)] italic">
            Você ainda não resgatou nenhum brinde.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {meusResgates!.map((r) => {
              const brindeNome = (r.brinde as unknown as { nome?: string })?.nome ?? "—";
              return (
                <li key={r.id as string} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{brindeNome}</p>
                    <p className="text-xs text-[var(--fg-muted)]">
                      <span className="font-mono">{r.codigo_unico as string}</span> · {r.custo as number} 🪙
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    r.status === "validado" ? "bg-[var(--success)] text-white" :
                    r.status === "pendente" ? "bg-[var(--accent)] text-[var(--accent-fg)]" :
                    "bg-gray-300"
                  }`}>
                    {r.status === "validado" ? "✓ Validado" :
                     r.status === "pendente" ? "Pendente" :
                     r.status === "expirado" ? "Expirado" : r.status as string}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
