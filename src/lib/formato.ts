// Formatos de exibição (sem depender do fuso do servidor).

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function data(iso: string | null | undefined) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MESES.at(Number(m) - 1)} ${a}`;
}

export function numero(n: number | null | undefined) {
  return n == null ? "—" : n.toLocaleString("pt-BR");
}

export const CASA = {
  camara: { nome: "Câmara dos Deputados", cargo: "Deputado(a) federal", na: "na Câmara" },
  senado: { nome: "Senado Federal", cargo: "Senador(a)", na: "no Senado" },
} as const;

export type Voto = "sim" | "nao" | "abstencao" | "obstrucao" | "ausente" | "outro";

// Cores neutras (aba 04 · Design): nenhuma cor diz se o voto foi "bom" ou "ruim".
export const VOTO: Record<Voto, { rotulo: string; fundo: string; texto: string }> = {
  sim: { rotulo: "Sim", fundo: "#e3ecfd", texto: "#163482" },
  nao: { rotulo: "Não", fundo: "#fbe6da", texto: "#7a2e07" },
  abstencao: { rotulo: "Abstenção", fundo: "#eceae3", texto: "#3d4148" },
  obstrucao: { rotulo: "Obstrução", fundo: "#eceae3", texto: "#3d4148" },
  ausente: { rotulo: "Ausente", fundo: "#eceae3", texto: "#3d4148" },
  outro: { rotulo: "Outro", fundo: "#eceae3", texto: "#3d4148" },
};

export function rotuloVoto(voto: Voto, original?: string | null) {
  if (voto === "outro" && original) return original;
  return VOTO[voto].rotulo;
}

export function siglaProposicao(tipo?: string | null, numero?: number | null, ano?: number | null) {
  if (!tipo) return "";
  return `${tipo} ${numero}/${ano}`;
}

export function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// "COMBUSTÍVEIS E LUBRIFICANTES." → "Combustíveis e lubrificantes"
export function categoriaLegivel(c: string) {
  const t = c.trim().replace(/\.$/, "").replace(/\s*,\s*/g, ", ");
  if (t !== t.toUpperCase()) return t;
  const m = t.toLocaleLowerCase("pt-BR");
  return m.charAt(0).toLocaleUpperCase("pt-BR") + m.slice(1);
}
