// Sonda das fontes oficiais: mede o ano inicial de cada arquivo e mostra o formato das respostas.
// Roda no GitHub Actions (que alcança os sites oficiais). Não grava nada.

const UA = { "User-Agent": "na-conta-sonda (+https://github.com/DevSantosRj/na-conta)" };

async function status(url, opts = {}) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: UA, ...opts });
    return r.status;
  } catch (e) {
    return `erro:${e.cause?.code ?? e.message}`;
  }
}

async function amostra(url, n = 1500, headers = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...headers } });
    const t = await r.text();
    return `${r.status} ${r.headers.get("content-type")}\n${t.slice(0, n)}`;
  } catch (e) {
    return `erro:${e.cause?.code ?? e.message}`;
  }
}

async function primeiroAno(nome, de, ate) {
  const achados = [];
  for (let ano = de; ano <= ate; ano++) {
    const url = `https://dadosabertos.camara.leg.br/arquivos/${nome}/csv/${nome}-${ano}.csv`;
    const s = await status(url);
    if (s === 200) achados.push(ano);
  }
  return achados;
}

async function cabecalho(nome, ano) {
  const url = `https://dadosabertos.camara.leg.br/arquivos/${nome}/csv/${nome}-${ano}.csv`;
  try {
    const r = await fetch(url, { headers: { ...UA, Range: "bytes=0-2000" } });
    const t = await r.text();
    return t.split("\n").slice(0, 3).join("\n");
  } catch (e) {
    return `erro:${e.message}`;
  }
}

const anoAtual = new Date().getUTCFullYear();

console.log("=== CÂMARA · arquivos anuais disponíveis ===");
for (const nome of ["votacoes", "votacoesVotos", "votacoesOrientacoes", "votacoesProposicoes", "proposicoes", "proposicoesAutores"]) {
  const anos = await primeiroAno(nome, 1934, anoAtual);
  const faixa = anos.length ? `${anos[0]}–${anos.at(-1)} (${anos.length} arquivos)` : "nenhum";
  console.log(`${nome}: ${faixa}`);
  console.log(`  cabeçalho ${anoAtual}:\n${(await cabecalho(nome, anoAtual)).replace(/^/gm, "    ")}`);
}

console.log("\n=== CÂMARA · deputados.csv (só o cabeçalho; tem CPF, nunca guardar) ===");
console.log((await amostra("https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv", 400)).split("\n").slice(0, 2).join("\n"));

console.log("\n=== CÂMARA · cota parlamentar (despesas) ===");
for (const ano of [2008, 2009, 2010, anoAtual]) {
  console.log(`Ano-${ano}.csv.zip: ${await status(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`)}`);
}

console.log("\n=== CÂMARA · API v2 ===");
console.log(await amostra("https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=2", 1200, { Accept: "application/json" }));
console.log(await amostra("https://dadosabertos.camara.leg.br/api/v2/legislaturas?ordem=ASC&ordenarPor=id&itens=3", 800, { Accept: "application/json" }));

console.log("\n=== SENADO · endpoints ===");
const S = "https://legis.senado.leg.br/dadosabertos";
for (const caminho of [
  "/senador/lista/atual.json",
  "/senador/lista/legislatura/57.json",
  `/plenario/lista/votacao/${anoAtual}0301/${anoAtual}0331.json`,
  `/votacao?dataInicio=${anoAtual}-03-01&dataFim=${anoAtual}-03-31`,
]) {
  console.log(`--- ${caminho}`);
  console.log(await amostra(S + caminho, 2500, { Accept: "application/json" }));
}

console.log("\n=== SENADO · primeiro ano com votações nominais ===");
for (const ano of [1988, 1991, 1995, 1999, 2001, 2003, 2005]) {
  const r = await amostra(`${S}/plenario/lista/votacao/${ano}0101/${ano}1231.json`, 200, { Accept: "application/json" });
  console.log(`${ano}: ${r.split("\n")[0]} ${r.includes("Votacao") ? "com votações" : "sem votações"}`);
}

console.log("\n=== PORTAL DA TRANSPARÊNCIA ===");
console.log(await amostra("https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=2024&pagina=1", 300));
