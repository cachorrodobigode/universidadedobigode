"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full bg-white border border-[var(--border)] rounded-2xl p-8 shadow-lg">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-xl font-extrabold mb-2">Algo deu errado</h1>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Houve um problema ao carregar essa página. Tenta de novo, e se persistir,
          contate a gestora.
        </p>
        {error.message && (
          <details className="text-xs text-[var(--fg-muted)] bg-gray-50 p-3 rounded mb-4 overflow-auto max-h-40">
            <summary className="cursor-pointer font-semibold">
              Detalhes técnicos {error.digest ? `(${error.digest})` : ""}
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
          </details>
        )}
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-bold text-[var(--primary-fg)] hover:opacity-95"
          >
            Tentar de novo
          </button>
          <a
            href="/login"
            className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 font-bold text-center hover:bg-gray-50"
          >
            Voltar pro login
          </a>
        </div>
      </div>
    </div>
  );
}
