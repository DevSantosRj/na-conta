// Estados e número de deputados federais (57ª legislatura).
// Fonte: Câmara dos Deputados. Na etapa 2 estes valores passam a vir do banco.
export type Estado = {
  uf: string;
  nome: string;
  regiao: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
  deputados: number;
};

export const ESTADOS: Estado[] = [
  { uf: "AC", nome: "Acre", regiao: "Norte", deputados: 8 },
  { uf: "AL", nome: "Alagoas", regiao: "Nordeste", deputados: 9 },
  { uf: "AP", nome: "Amapá", regiao: "Norte", deputados: 8 },
  { uf: "AM", nome: "Amazonas", regiao: "Norte", deputados: 8 },
  { uf: "BA", nome: "Bahia", regiao: "Nordeste", deputados: 39 },
  { uf: "CE", nome: "Ceará", regiao: "Nordeste", deputados: 22 },
  { uf: "DF", nome: "Distrito Federal", regiao: "Centro-Oeste", deputados: 8 },
  { uf: "ES", nome: "Espírito Santo", regiao: "Sudeste", deputados: 10 },
  { uf: "GO", nome: "Goiás", regiao: "Centro-Oeste", deputados: 17 },
  { uf: "MA", nome: "Maranhão", regiao: "Nordeste", deputados: 18 },
  { uf: "MT", nome: "Mato Grosso", regiao: "Centro-Oeste", deputados: 8 },
  {
    uf: "MS",
    nome: "Mato Grosso do Sul",
    regiao: "Centro-Oeste",
    deputados: 8,
  },
  { uf: "MG", nome: "Minas Gerais", regiao: "Sudeste", deputados: 53 },
  { uf: "PA", nome: "Pará", regiao: "Norte", deputados: 17 },
  { uf: "PB", nome: "Paraíba", regiao: "Nordeste", deputados: 12 },
  { uf: "PR", nome: "Paraná", regiao: "Sul", deputados: 30 },
  { uf: "PE", nome: "Pernambuco", regiao: "Nordeste", deputados: 25 },
  { uf: "PI", nome: "Piauí", regiao: "Nordeste", deputados: 10 },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "Sudeste", deputados: 46 },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "Nordeste", deputados: 8 },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "Sul", deputados: 31 },
  { uf: "RO", nome: "Rondônia", regiao: "Norte", deputados: 8 },
  { uf: "RR", nome: "Roraima", regiao: "Norte", deputados: 8 },
  { uf: "SC", nome: "Santa Catarina", regiao: "Sul", deputados: 16 },
  { uf: "SP", nome: "São Paulo", regiao: "Sudeste", deputados: 70 },
  { uf: "SE", nome: "Sergipe", regiao: "Nordeste", deputados: 8 },
  { uf: "TO", nome: "Tocantins", regiao: "Norte", deputados: 8 },
];

// Faixas de cor do mapa (aba 04 · Design)
export const FAIXAS = [
  { ate: 8, rotulo: "8", fundo: "#dce6fb", sigla: "#15171a" },
  { ate: 12, rotulo: "9–12", fundo: "#b3c8f5", sigla: "#15171a" },
  { ate: 22, rotulo: "13–22", fundo: "#7fa2ec", sigla: "#15171a" },
  { ate: 39, rotulo: "23–39", fundo: "#3563d3", sigla: "#ffffff" },
  { ate: 70, rotulo: "40–70", fundo: "#1d3f9e", sigla: "#ffffff" },
] as const;

export function faixaDe(deputados: number) {
  return FAIXAS.find((f) => deputados <= f.ate) ?? FAIXAS[FAIXAS.length - 1];
}

// Preposição + artigo antes do nome do estado ("do Amapá", "da Bahia", "de São Paulo")
const PREPOSICAO: Record<string, "do" | "da" | "de"> = {
  AC: "do",
  AL: "de",
  AP: "do",
  AM: "do",
  BA: "da",
  CE: "do",
  DF: "do",
  ES: "do",
  GO: "de",
  MA: "do",
  MT: "de",
  MS: "de",
  MG: "de",
  PA: "do",
  PB: "da",
  PR: "do",
  PE: "de",
  PI: "do",
  RJ: "do",
  RN: "do",
  RS: "do",
  RO: "de",
  RR: "de",
  SC: "de",
  SP: "de",
  SE: "de",
  TO: "do",
};

export function doEstado(uf: string, nome: string) {
  return `${PREPOSICAO[uf] ?? "de"} ${nome}`;
}
