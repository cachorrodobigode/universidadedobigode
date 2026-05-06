"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { trocarSenhaPerfilAction, type TrocarSenhaState } from "./actions";
import { toast } from "sonner";

const inicial: TrocarSenhaState = {};

export function TrocarSenhaCard() {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(trocarSenhaPerfilAction, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      formRef.current?.reset();
      setAberto(false);
    }
    if (state.erro) toast.error(state.erro);
  }, [state]);

  return (
    <section className="rounded-xl bg-white border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--bg)] transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-bold text-sm">Trocar minha senha</p>
            <p className="text-xs text-[var(--fg-muted)]">Mude pra uma senha que só você sabe</p>
          </div>
        </div>
        <span className="text-[var(--fg-muted)]">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <form ref={formRef} action={action} className="border-t border-[var(--border)] p-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold">Nova senha</span>
            <input
              name="nova_senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres, com letras e números"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold">Confirme a senha nova</span>
            <input
              name="confirma"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-2 font-bold text-sm disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar nova senha"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="text-sm rounded-lg border border-[var(--border)] bg-white px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
