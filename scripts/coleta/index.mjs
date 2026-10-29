// Coordena os robôs de coleta. Uso:
//   node scripts/coleta/index.mjs                 → anos da legislatura atual (2023 até hoje)
//   ANOS=2025,2026 node scripts/coleta/index.mjs  → só esses anos
//   FONTES=camara node scripts/coleta/index.mjs   → só a Câmara (ou "senado")
//   FONTES=proposicoes                            → só proposições da Câmara (anos antigos)
//   FONTES=senado-autorias                        → autoria de projetos dos senadores, carreira inteira
//   FONTES=emendas                                → emendas parlamentares (todos os anos, Portal da Transparência)
//   FONTES=gastos                                 → cota parlamentar (CEAP/CEAPS) dos anos pedidos
//   FONTES=ibge                                   → população de estados e municípios (IBGE/SIDRA)
//   FONTES=presidencias                           → listas oficiais de presidentes (scripts/dados)
//   FONTES=cruzada                                → liga a ficha da Câmara e a do Senado da mesma pessoa
//   FONTES=federativo                             → pacto federativo: arrecadação por estado e transferências constitucionais
//   FONTES=partidos                               → partido em cada mandato anterior (histórico oficial)
//   FONTES=carreira                               → mandatos anteriores de quem está no mandato hoje
// Anos antes de 2023 são histórico: só entram votos e proposições de quem está no mandato hoje.
import * as camara from "./camara.mjs";
import * as cruzada from "./cruzada.mjs";
import { db, registrar } from "./comum.mjs";
import { conferirCamara } from "./conferir.mjs";
import * as emendas from "./emendas.mjs";
import * as gastos from "./gastos.mjs";
import * as ibge from "./ibge.mjs";
import * as federativo from "./federativo.mjs";
import * as presidencias from "./presidencias.mjs";
import * as senado from "./senado.mjs";

const hoje = new Date().getUTCFullYear();
const anos = process.env.ANOS
  ? process.env.ANOS.split(",").map(Number)
  : Array.from({ length: hoje - 2023 + 1 }, (_, i) => 2023 + i);
// "conferir" compara os placares gravados com os oficiais (roda por padrão após a coleta)
const fontes = (process.env.FONTES || "camara,senado,gastos,conferir").split(",");

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
  // Rodada diária: só projetos apresentados nos últimos 90 dias
  const desde = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  await etapa("senado:autorias", () => senado.autorias({ desde }));
}
// Carga completa da autoria de projetos dos senadores (toda a carreira no Senado)
if (fontes.includes("senado-autorias")) await etapa("senado:autorias:completa", () => senado.autorias());

if (fontes.includes("presidencias")) await etapa("presidencias", presidencias.carregar);
if (fontes.includes("ibge")) await etapa("ibge:populacao", ibge.populacao);
// Emendas (Portal da Transparência): arquivo único com todos os anos; na rodada diária, só às segundas
if (fontes.includes("emendas") || (!process.env.FONTES && new Date().getUTCDay() === 1)) await etapa("emendas", emendas.carregar);
// Cota parlamentar: soma por mês e categoria (Câmara e Senado)
// Pacto federativo: toda segunda-feira na rodada normal, ou quando pedido
if (fontes.includes("federativo") || (!process.env.FONTES && new Date().getUTCDay() === 1)) {
  await etapa("federativo:arrecadacao", federativo.arrecadacao);
  await etapa("federativo:transferencias", () => federativo.transferencias());
}

if (fontes.includes("gastos")) {
  for (const ano of anos) await etapa(`gastos:camara:${ano}`, () => gastos.camara(ano));
  for (const ano of anos) await etapa(`gastos:senado:${ano}`, () => gastos.senado(ano));
}

// Liga Câmara e Senado da mesma pessoa (antes da carreira, para os mandatos das fichas novas entrarem)
if (fontes.includes("cruzada")) await etapa("cruzada", cruzada.ligar);

if (fontes.includes("carreira")) {
  const { data, error } = await db.from("estados").select("uf");
  if (error) throw new Error(`estados: ${error.message}`);
  const ufs = new Set(data.map((e) => e.uf));
  const datas = await camara.legislaturas();
  await etapa("camara:carreira", () => camara.carreira(ufs, datas));
  await etapa("senado:carreira", () => senado.carreira(ufs, datas));
}

// A conferência compara com o placar oficial completo, por isso só vale para anos fora do histórico.
if (fontes.includes("partidos") || fontes.includes("carreira")) {
  await etapa("camara:partidos", camara.partidos);
  await etapa("senado:partidos", senado.partidos);
}

if (fontes.includes("conferir")) {
  for (const ano of anos.filter((a) => !camara.historico(a))) await etapa(`conferencia:camara:${ano}`, () => conferirCamara(ano));
}

if (falhas) {
  console.error(`${falhas} etapa(s) com erro — detalhes na tabela coletas.`);
  process.exit(1);
}
