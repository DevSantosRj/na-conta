// Coordena os robôs de coleta. Uso:
//   node scripts/coleta/index.mjs                 → anos da legislatura atual (2023 até hoje)
//   ANOS=2025,2026 node scripts/coleta/index.mjs  → só esses anos
//   FONTES=camara node scripts/coleta/index.mjs   → só a Câmara (ou "senado")
import * as camara from "./camara.mjs";
import { registrar } from "./comum.mjs";
import { conferirCamara } from "./conferir.mjs";
import * as senado from "./senado.mjs";

const hoje = new Date().getUTCFullYear();
const anos = process.env.ANOS
  ? process.env.ANOS.split(",").map(Number)
  : Array.from({ length: hoje - 2023 + 1 }, (_, i) => 2023 + i);
// "conferir" compara os placares gravados com os oficiais (roda por padrão após a coleta)
const fontes = (process.env.FONTES || "camara,senado,conferir").split(",");

let falhas = 0;
async function etapa(nome, fn) {
  try {
    await registrar(nome, fn);
  } catch (e) {
    falhas++;
    console.error(`✖ ${nome}: ${e.message}`);
  }
}

console.log(`Coleta · anos ${anos.join(", ")} · fontes ${fontes.join(", ")}`);

if (fontes.includes("camara")) {
  await etapa("camara:deputados", camara.deputados);
  for (const ano of anos) await etapa(`camara:proposicoes:${ano}`, () => camara.proposicoes(ano));
  for (const ano of anos) await etapa(`camara:votacoes:${ano}`, () => camara.votacoes(ano));
}
if (fontes.includes("senado")) {
  await etapa("senado:senadores", senado.senadores);
  for (const ano of anos) await etapa(`senado:votacoes:${ano}`, () => senado.votacoes(ano));
}

if (fontes.includes("conferir")) {
  for (const ano of anos) await etapa(`conferencia:camara:${ano}`, () => conferirCamara(ano));
}

if (falhas) {
  console.error(`${falhas} etapa(s) com erro — detalhes na tabela coletas.`);
  process.exit(1);
}
