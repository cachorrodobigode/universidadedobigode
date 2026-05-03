"use client";

import { useState } from "react";

export function ComoFuncionaCard() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-xl bg-white border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--bg)] transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-bold text-sm">Como funciona a Universidade do Bigode</p>
            <p className="text-xs text-[var(--fg-muted)]">Toque pra entender o que rolar com Bigocoins</p>
          </div>
        </div>
        <span className="text-[var(--fg-muted)]">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <div className="border-t border-[var(--border)] p-4 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">📺</span>
            <p>
              <strong>1. Assista aos vídeos da sua trilha.</strong> Cada módulo tem um vídeo
              curto + (opcional) um quiz pra fixar o que aprendeu.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🪙</span>
            <p>
              <strong>2. Conclua o módulo</strong> e ganhe os <strong>Bigocoins</strong> da
              recompensa. O saldo aparece no topo da trilha e na Loja de Brindes.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🎁</span>
            <p>
              <strong>3. Resgate brindes na Loja</strong> com seus Bigocoins. Vai gerar um
              código + QR que vale 30 dias.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">📱</span>
            <p>
              <strong>4. Mostre o código pro gerente da loja.</strong> Ele valida o cupom no
              sistema e te entrega o brinde ou aplica o desconto.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🏆</span>
            <p>
              <strong>5. Suba no ranking.</strong> Quanto mais módulos concluir, mais alto fica
              entre os colegas. No fim do ano os melhores vão pra prova presencial.
            </p>
          </div>
          <p className="text-xs text-[var(--fg-muted)] pt-2 border-t border-[var(--border)]">
            🔒 <strong>Importante:</strong> os vídeos têm o seu CPF marcado como assinatura.
            Não compartilhe — o vazador é identificado.
          </p>
        </div>
      )}
    </div>
  );
}
