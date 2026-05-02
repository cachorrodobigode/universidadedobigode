"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 20, background: "#FFF8E7" }}>
        <div style={{ maxWidth: 560, margin: "60px auto", background: "white", padding: 24, borderRadius: 12, border: "1px solid #E7D5B8" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>🌭 Algo deu errado (root)</h1>
          <p style={{ color: "#7A5C3A", fontSize: 14, marginBottom: 16 }}>
            Erro fatal no app. Detalhes técnicos:
          </p>
          <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflow: "auto" }}>
{error.message}
{error.digest ? `\n\nDigest: ${error.digest}` : ""}
{error.stack ? `\n\nStack:\n${error.stack}` : ""}
          </pre>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={reset} style={{ flex: 1, background: "#D7263D", color: "white", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
              Tentar de novo
            </button>
            <a href="/login" style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #E7D5B8", borderRadius: 8, fontWeight: 700, textDecoration: "none", color: "#2A1A0A" }}>
              Voltar pro login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
