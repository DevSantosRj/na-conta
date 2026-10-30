"use client";

// Último recurso: quando até o layout falha. Não usa os estilos do site, por isso o visual é escrito aqui.
export default function ErroGeral({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#f5f4ef", color: "#15171a", fontFamily: "system-ui, sans-serif" }}>
        <title>Erro · Na Conta</title>
        <main style={{ maxWidth: 560, margin: "64px auto", padding: "0 20px" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>O Na Conta está com um problema</h1>
          <p style={{ color: "#4a4d52", fontSize: 17 }}>Tente de novo em alguns segundos. Se continuar, avise @DEVSANTOSRJ no X.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 44, padding: "0 18px", border: 0, borderRadius: 10, background: "#1f4fd8", color: "#fff", fontSize: 16 }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
