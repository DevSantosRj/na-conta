// Meu imposto: IR retido na fonte e INSS de quem tem carteira assinada, com as tabelas oficiais de 2026.
// Fontes: Receita Federal (tabelas de 2026 e exemplos da Lei 15.270/2025) e INSS (Portaria Interministerial MPS/MF nº 13/2026).

export const FONTES = {
  ir: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026",
  exemplos: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025",
  inss: "https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal",
};

// INSS — empregado, doméstico e avulso, a partir da competência janeiro/2026
export const INSS = [
  { ate: 1621.0, aliquota: 0.075 },
  { ate: 2902.84, aliquota: 0.09 },
  { ate: 4354.27, aliquota: 0.12 },
  { ate: 8475.55, aliquota: 0.14 },
] as const;

// IR — tabela de incidência mensal a partir de janeiro/2026
export const IR = [
  { ate: 2428.8, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
] as const;

export const DEDUCAO_DEPENDENTE = 189.59;
export const DESCONTO_SIMPLIFICADO = 607.2;

// Arredonda para centavos (meio centavo para cima), sem erro de ponto flutuante (121,575 → 121,58)
const centavos = (v: number) => Math.round(Number((v * 100).toPrecision(12))) / 100;

export type FaixaInss = { de: number; ate: number; aliquota: number; valor: number };

export function calcularInss(bruto: number) {
  const faixas: FaixaInss[] = [];
  let anterior = 0;
  for (const f of INSS) {
    if (bruto <= anterior) break;
    const topo = Math.min(bruto, f.ate);
    faixas.push({ de: anterior, ate: topo, aliquota: f.aliquota, valor: (topo - anterior) * f.aliquota });
    anterior = f.ate;
  }
  return { total: centavos(faixas.reduce((s, f) => s + f.valor, 0)), faixas, noTeto: bruto > INSS[INSS.length - 1].ate };
}

// Redução da Lei 15.270/2025 (art. 3º-A da Lei 9.250/1995): usa o rendimento tributável (salário), não a base de cálculo
export function reducaoLei15270(rendimento: number, impostoTabela: number) {
  if (rendimento <= 5000) return centavos(Math.min(impostoTabela, 312.89));
  if (rendimento <= 7350) return centavos(Math.max(0, Math.min(impostoTabela, 978.62 - 0.133145 * rendimento)));
  return 0;
}

export function calcularIr(rendimento: number, deducoesLegais: number) {
  const usaSimplificado = DESCONTO_SIMPLIFICADO > deducoesLegais;
  const desconto = usaSimplificado ? DESCONTO_SIMPLIFICADO : deducoesLegais;
  const base = centavos(Math.max(0, rendimento - desconto));
  const faixaIndice = IR.findIndex((f) => base <= f.ate);
  const faixa = IR[faixaIndice];
  const impostoTabela = centavos(Math.max(0, base * faixa.aliquota - faixa.deducao));
  const reducao = reducaoLei15270(rendimento, impostoTabela);
  return { usaSimplificado, desconto: centavos(desconto), base, faixa: faixaIndice + 1, aliquota: faixa.aliquota, impostoTabela, reducao, imposto: centavos(impostoTabela - reducao) };
}

export function calcular(bruto: number, dependentes: number) {
  const inss = calcularInss(bruto);
  const deducoesLegais = inss.total + dependentes * DEDUCAO_DEPENDENTE;
  const ir = calcularIr(bruto, deducoesLegais);
  return { bruto, dependentes, inss, deducoesLegais: centavos(deducoesLegais), ir, liquido: centavos(bruto - inss.total - ir.imposto) };
}
