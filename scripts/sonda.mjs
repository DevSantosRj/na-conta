// Sonda das fontes oficiais (2ª rodada): formato do serviço novo de votações do Senado e até onde ele vai.
// A 1ª rodada (Câmara) está registrada em docs/fontes.md.

const UA = { "User-Agent": "na-conta-sonda (+https://github.com/DevSantosRj/na-conta)", Accept: "application/json" };
const S = "https://legis.senado.leg.br/dadosabertos";

async function json(url) {
  const r = await fetch(url, { headers: UA });
  const t = await r.text();
  try {
    return { status: r.status, dados: JSON.parse(t) };
  } catch {
    return { status: r.status, texto: t.slice(0, 300) };
  }
}

console.log("=== SENADO · /votacao (serviço novo) · formato ===");
const ex = await json(`${S}/votacao?dataInicio=2026-03-01&dataFim=2026-03-31`);
if (Array.isArray(ex.dados) && ex.dados.length) {
  const v = ex.dados[0];
  const { votos, informeLegislativo, ...resto } = v;
  console.log("campos da votação:", JSON.stringify(resto));
  console.log("1º voto:", JSON.stringify(votos?.[0]));
  console.log("tipos de voto vistos:", JSON.stringify([...new Set(ex.dados.flatMap((x) => (x.votos ?? []).map((y) => `${y.siglaVotoParlamentar ?? y.voto ?? "?"}|${y.descricaoVotoParlamentar ?? ""}`)))]));
  console.log("votações em mar/2026:", ex.dados.length, "· secretas:", ex.dados.filter((x) => x.votacaoSecreta === "S").length);
} else console.log(ex.status, ex.texto ?? JSON.stringify(ex.dados).slice(0, 300));

console.log("\n=== SENADO · /votacao · cobertura por ano (1 ano por consulta) ===");
for (const ano of [1991, 1995, 1999, 2001, 2003, 2005, 2007, 2011, 2015, 2019, 2023]) {
  const r = await json(`${S}/votacao?dataInicio=${ano}-01-01&dataFim=${ano}-12-31`);
  console.log(`${ano}: HTTP ${r.status} · ${Array.isArray(r.dados) ? r.dados.length + " votações" : (r.texto ?? "").slice(0, 120)}`);
}

console.log("\n=== SENADO · lista da legislatura 57 · formato de Mandatos ===");
const leg = await json(`${S}/senador/lista/legislatura/57.json`);
const ps = leg.dados?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar ?? [];
console.log("parlamentares:", ps.length, "· Mandatos.Mandato é lista?", Array.isArray(ps[0]?.Mandatos?.Mandato));
