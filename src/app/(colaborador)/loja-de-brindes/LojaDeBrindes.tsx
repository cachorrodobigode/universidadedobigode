"use client";

import { useActionState, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { resgatarBrindeAction, type ResgatarState } from "@/app/admin/brindes/actions";
import { toast } from "sonner";

const inicial: ResgatarState = {};

type Brinde = {
  id: string;
  nome: string;
  descricao: string | null;
  custo_bigocoins: number;
  estoque: number;
  foto_url: string | null;
};

type Resgate = {
  id: string;
  codigo_unico: string;
  status: string;
  custo: number;
  criado_em: string;
  expira_em: string;
  brinde: { nome: string } | null;
};

export function LojaDeBrindes({
  saldo,
  brindes,
  meusResgates,
}: {
  saldo: number;
  brindes: Brinde[];
  meusResgates: Resgate[];
}) {
  const [state, action, pending] = useActionState(resgatarBrindeAction, inicial);
  const [confirmando, setConfirmando] = useState<Brinde | null>(null);
  const [cupomGerado, setCupomGerado] = useState<{ codigo: string; brinde: string; saldo: number } | null>(null);

  useEffect(() => {
    if (state.erro) toast.error(state.erro);
    if (state.resgate) {
      setCupomGerado({
        codigo: state.resgate.codigo_unico,
        brinde: confirmando?.nome ?? "",
        saldo: state.resgate.saldo_apos,
      });
      setConfirmando(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#FFD970] p-6 shadow-md">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--secondary)]">Loja de Brindes</p>
        <div className="flex items-end justify-between mt-2">
          <h1 className="text-2xl font-extrabold">🎁 Catálogo</h1>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-[var(--secondary)]">Seu saldo</p>
            <p className="text-3xl font-extrabold">
              {saldo} <span className="text-lg">🪙</span>
            </p>
          </div>
        </div>
      </section>

      {brindes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
          <p className="text-4xl mb-2">🛍️</p>
          <h3 className="font-bold text-lg">Nenhum brinde cadastrado ainda</h3>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            A gestora ainda não publicou brindes. Volte em breve!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brindes.map((b) => {
            const semSaldo = saldo < b.custo_bigocoins;
            const semEstoque = b.estoque <= 0;
            const desabilitado = semSaldo || semEstoque;
            return (
              <div key={b.id} className="rounded-xl bg-white border border-[var(--border)] overflow-hidden flex flex-col">
                {b.foto_url ? (
                  <img src={b.foto_url} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-[var(--bg)] flex items-center justify-center text-6xl">🎁</div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold">{b.nome}</h3>
                  {b.descricao && <p className="text-xs text-[var(--fg-muted)] mt-1 line-clamp-2">{b.descricao}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-extrabold text-[var(--primary)]">{b.custo_bigocoins} 🪙</span>
                    <span className="text-xs text-[var(--fg-muted)]">estoque {b.estoque}</span>
                  </div>
                  <button
                    onClick={() => setConfirmando(b)}
                    disabled={desabilitado}
                    className="mt-3 w-full rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-[var(--primary-fg)] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {semEstoque ? "Esgotado" : semSaldo ? `Faltam ${b.custo_bigocoins - saldo} 🪙` : "Resgatar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="rounded-xl bg-white border border-[var(--border)] p-6">
        <h2 className="font-bold mb-3">Meus cupons ({meusResgates.length})</h2>
        {meusResgates.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">Você ainda não resgatou nenhum brinde.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {meusResgates.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{r.brinde?.nome ?? "—"}</p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Código: <span className="font-mono">{r.codigo_unico}</span> · {r.custo} 🪙
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  r.status === "validado" ? "bg-[var(--success)] text-white" :
                  r.status === "pendente" ? "bg-[var(--accent)] text-[var(--accent-fg)]" :
                  "bg-gray-300"
                }`}>
                  {r.status === "validado" ? "✓ Validado" :
                   r.status === "pendente" ? "Aguardando validação" :
                   r.status === "expirado" ? "Expirado" : r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal de confirmação */}
      {confirmando && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-extrabold text-lg">Resgatar brinde?</h3>
            <p className="text-sm">
              <strong>{confirmando.nome}</strong> custa{" "}
              <strong>{confirmando.custo_bigocoins} 🪙</strong>. Você ficará com{" "}
              <strong>{saldo - confirmando.custo_bigocoins} 🪙</strong>.
            </p>
            <p className="text-xs text-[var(--fg-muted)]">
              Você vai receber um código pra mostrar no balcão. Tem 30 dias pra usar.
            </p>
            <form action={action} className="flex gap-2">
              <input type="hidden" name="brinde_id" value={confirmando.id} />
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-2 font-bold disabled:opacity-50"
              >
                {pending ? "Resgatando..." : "Confirmar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cupom gerado */}
      {cupomGerado && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="text-4xl">🎉</div>
            <h3 className="font-extrabold text-lg">Cupom gerado!</h3>
            <p className="text-sm">{cupomGerado.brinde}</p>
            <div className="bg-[var(--bg)] border-2 border-dashed border-[var(--accent)] rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-[var(--fg-muted)]">Mostre na loja</p>
              <p className="text-2xl font-extrabold tracking-wider font-mono mt-1">{cupomGerado.codigo}</p>
              <div className="mt-3 flex justify-center">
                <QRCodeSVG value={cupomGerado.codigo} size={140} />
              </div>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              Saldo agora: <strong>{cupomGerado.saldo} 🪙</strong> · Válido por 30 dias
            </p>
            <button
              onClick={() => setCupomGerado(null)}
              className="w-full rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-2 font-bold"
            >
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
