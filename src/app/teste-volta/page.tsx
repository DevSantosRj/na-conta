import { connection } from "next/server";

// Versão com erro proposital (teste de "voltar atrás" da etapa 6). Será desfeita logo em seguida.
// Só falha com o site no ar (na hora do pedido), para passar pelo build.
export default async function TesteVolta() {
  await connection();
  throw new Error("Erro proposital: teste de voltar atrás");
}
