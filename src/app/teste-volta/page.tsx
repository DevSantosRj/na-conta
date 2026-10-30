import { connection } from "next/server";
import { Suspense } from "react";

// Versão com erro proposital (teste de "voltar atrás" da etapa 6). Será desfeita logo em seguida.
// Só falha com o site no ar (na hora do pedido), para passar pelo build.
async function Falha(): Promise<React.ReactNode> {
  await connection();
  throw new Error("Erro proposital: teste de voltar atrás");
}

export default function TesteVolta() {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <Falha />
    </Suspense>
  );
}
