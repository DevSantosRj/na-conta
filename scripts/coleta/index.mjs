// Coordena os robôs de coleta. Uso:
//   node scripts/coleta/index.mjs                 → anos da legislatura atual (2023 até hoje)
//   ANOS=2025,2026 node scripts/coleta/index.mjs  → só esses anos
//   FONTES=camara node scripts/coleta/index.mjs   → só a Câmara (ou "senado")
//   FONTES=proposicoes                            → só proposições da Câmara (anos antigos)
//   FONTES=presidencias                           → listas oficiais de presidentes (scripts/dados)
//   FONTES=carreira                               → mandatos anteriores de quem está no mandato hoje
// Anos antes de 2023 são histórico: só entram votos e proposições de quem está no mandato hoje.
import * as camara from "./camara.mjs";
import { db, registrar } from "./comum.mjs";
import { conferirCamara } from "./conferir.mjs";
import * as presidencias from "./presidencias.mjs";
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
  await etapa("camara:vinculos", camara.vincular);
}
// Só proposições (anos antes de 2001, quando a Câmara ainda não publicava votos individuais)
if (fontes.includes("proposicoes")) {
  for (const ano of anos) await etapa(`camara:proposicoes:${ano}`, () => camara.proposicoes(ano));
  await etapa("camara:vinculos", camara.vincular);
}
if (fontes.includes("senado")) {
  await etapa("senado:senadores", senado.senadores);
  for (const ano of anos) await etapa(`senado:votacoes:${ano}`, () => senado.votacoes(ano));
}

if (fontes.includes("presidencias")) await etapa("presidencias", presidencias.carregar);

if (fontes.includes("carreira")) {
  const { data, error } = await db.from("estados").select("uf");
  if (error) throw new Error(`estados: ${error.message}`);
  const ufs = new Set(data.map((e) => e.uf));
  const datas = await camara.legislaturas();
  await etapa("camara:carreira", () => camara.carreira(ufs, datas));
  await etapa("senado:carreira", () => senado.carreira(ufs, datas));
}

// A conferência compara com o placar oficial completo, por isso só vale para anos fora do histórico.
if (fontes.includes("conferir")) {
  for (const ano of anos.filter((a) => !camara.historico(a))) await etapa(`conferencia:camara:${ano}`, () => conferirCamara(ano));
}

if (falhas) {
  console.error(`${falhas} etapa(s) com erro — detalhes na tabela coletas.`);
  process.exit(1);
}
