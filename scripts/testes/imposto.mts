// Confere o Meu imposto com os exemplos oficiais da Receita (Lei 15.270/2025) e com o teto do INSS 2026.
import { calcularInss, calcularIr } from "../../src/lib/imposto.ts";
// Os 5 exemplos oficiais da Receita (salário, dedução legal informada, IR esperado)
const exemplos: [number, number, number][] = [
  [3036.0, 257.73, 0],
  [4000.0, 373.41, 0],
  [5000.0, 509.6, 0],
  [6000.0, 649.6, 382.88],
  [7607.2, 0, 1016.27],
];
let ok = true;
for (const [s, d, esperado] of exemplos) {
  const r = calcularIr(s, d);
  const bate = r.imposto === esperado;
  ok &&= bate;
  console.log(bate ? "OK " : "ERRO", `salário ${s} dedução ${d} → base ${r.base} tabela ${r.impostoTabela} redução ${r.reducao} IR ${r.imposto} (esperado ${esperado})`);
}
// INSS: teto oficial e faixas
for (const [s, esperado] of [[8475.55, 988.09], [20000, 988.09], [1621, 121.58]] as const) {
  const t = calcularInss(s).total;
  const bate = t === esperado;
  ok &&= bate;
  console.log(bate ? "OK " : "ERRO", `INSS salário ${s} → ${t} (esperado ${esperado})`);
}
process.exit(ok ? 0 : 1);
