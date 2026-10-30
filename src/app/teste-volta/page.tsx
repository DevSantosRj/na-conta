// Versão com erro proposital (teste de "voltar atrás" da etapa 6). Será desfeita logo em seguida.
export default async function TesteVolta() {
  throw new Error("Erro proposital: teste de voltar atrás");
}
