/* eslint-disable @typescript-eslint/no-unused-vars -- sonda: funções de apoio usadas em rodadas diferentes */
// Sonda das fontes oficiais (7ª rodada): conferência de 10 números sorteados contra a fonte oficial (teste da etapa 4).
// Rodadas anteriores: histórico do git e docs/fontes.md.

const UA = { "User-Agent": "na-conta-sonda (+https://github.com/DevSantosRj/na-conta)" };

const texto = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|tr|h\d|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

async function pagina(url, { links = null, max = 12000 } = {}) {
  console.log(`\n===== ${url}`);
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow" });
    const html = await r.text();
    console.log(`status ${r.status} · ${html.length} bytes · final ${r.url}`);
    const t = texto(html);
    const ini = Math.max(0, t.search(/President/i) - 200);
    console.log(t.slice(ini, ini + max));
    if (links) {
      const vistos = new Set();
      for (const m of html.matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
        const href = new URL(m[1], r.url).href;
        if (links.test(href) && !vistos.has(href)) {
          vistos.add(href);
          console.log(`LINK ${href} | ${texto(m[2]).slice(0, 80)}`);
        }
      }
    }
  } catch (e) {
    console.log("falhou:", e.message);
  }
}

 
async function json(url) {
  console.log(`\n===== ${url}`);
  try {
    const r = await fetch(url, { headers: { ...UA, Accept: "application/json" } });
    const t = await r.text();
    console.log(`status ${r.status}`);
    console.log(t.slice(0, 6000));
  } catch (e) {
    console.log("falhou:", e.message);
  }
}

import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";

// Baixa um arquivo (zip ou csv), mostra tamanho, colunas, 2 linhas de exemplo e o total de linhas.
async function arquivo(nome, url) {
  console.log(`\n===== ${nome} · ${url}`);
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow" });
    const b = Buffer.from(await r.arrayBuffer());
    console.log(`status ${r.status} · ${(b.length / 1e6).toFixed(1)} MB · ${r.headers.get("content-type")} · final ${r.url}`);
    if (!r.ok) return;
    const dir = `sonda-tmp/${nome}`;
    mkdirSync(dir, { recursive: true });
    if (b.subarray(0, 2).toString() === "PK") {
      writeFileSync(`${dir}/a.zip`, b);
      execSync(`cd ${dir} && unzip -o -q a.zip && rm a.zip`);
    } else writeFileSync(`${dir}/a.csv`, b);
    for (const f of readdirSync(dir)) {
      const caminho = `${dir}/${f}`;
      const linhas = execSync(`wc -l < "${caminho}"`).toString().trim();
      const amostra = execSync(`head -c 3000 "${caminho}" | iconv -f latin1 -t utf-8 2>/dev/null || head -c 3000 "${caminho}"`).toString().split("\n").slice(0, 3);
      console.log(`  ARQ ${f} · ${(statSync(caminho).size / 1e6).toFixed(1)} MB · ${linhas} linhas`);
      for (const l of amostra) console.log(`    ${l.slice(0, 900)}`);
    }
  } catch (e) {
    console.log("falhou:", e.message);
  }
}

// Conferência da etapa 4: 10 números sorteados do banco, buscados de novo na fonte oficial.
{
  const { parse } = await import("csv-parse");
  const { createReadStream } = await import("node:fs");
  const brl = (v) => Number(String(v).replace(/\./g, "").replace(",", "."));
  const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const baixar = async (url, nome) => {
    const r = await fetch(url, { headers: UA, redirect: "follow" });
    const b = Buffer.from(await r.arrayBuffer());
    mkdirSync("sonda-tmp/c", { recursive: true });
    const f = `sonda-tmp/c/${nome}`;
    writeFileSync(f, b);
    console.log(`baixado ${nome}: status ${r.status} · ${(b.length / 1e6).toFixed(1)} MB`);
    return f;
  };
  async function* linhas(arquivo, { zip = null, latin1 = false, pular = 0 } = {}) {
    const { spawn } = await import("node:child_process");
    const fonte = zip ? spawn("unzip", ["-p", arquivo, ...(zip === true ? [] : [zip])]).stdout : createReadStream(arquivo);
    const dec = new TextDecoder(latin1 ? "latin1" : "utf-8");
    const { Transform } = await import("node:stream");
    const t = new Transform({ transform(c, _e, cb) { cb(null, dec.decode(c, { stream: true })); } });
    yield* fonte.pipe(t).pipe(parse({ delimiter: ";", columns: true, from_line: pular + 1, relax_quotes: true, relax_column_count: true, bom: true }));
  }
  const res = (n, desc, banco, oficial) =>
    console.log(`#${n} ${desc}\n   banco: ${banco} | fonte: ${oficial} | ${String(banco) === String(oficial) ? "CONFERE" : "DIFERENTE"}`);

  // 1 e 2) Votos na Câmara, votação 2586587-30
  try {
    const r = await fetch("https://dadosabertos.camara.leg.br/api/v2/votacoes/2586587-30/votos", { headers: { ...UA, Accept: "application/json" } });
    const votos = (await r.json()).dados ?? [];
    const de = (id) => votos.find((v) => v.deputado_?.id === id)?.tipoVoto;
    res(1, "Fausto Pinato (C-66828) na votação 2586587-30", "nao", norm(de(66828)));
    res(2, "Felipe Becari (C-220646) na votação 2586587-30", "sim", norm(de(220646)));
  } catch (e) { console.log("#1-2 falhou", e.message); }

  // 3) Voto no Senado, sessão de votação 7036 (10/12/2025)
  try {
    const r = await fetch("https://legis.senado.leg.br/dadosabertos/votacao?dataInicio=2025-12-10&dataFim=2025-12-10", { headers: { ...UA, Accept: "application/json" } });
    const lista = await r.json();
    const v = (Array.isArray(lista) ? lista : []).find((x) => String(x.codigoSessaoVotacao) === "7036");
    const voto = v?.votos?.find((x) => String(x.codigoParlamentar) === "6009");
    console.log(`   (sessão ${v?.codigoSessaoVotacao} · ${v?.sigla} ${v?.numero}/${v?.ano} · registro bruto ${JSON.stringify(voto)})`);
    res(3, "Astronauta Marcos Pontes (S-6009) na votação 7036", "sim", norm(voto?.siglaVotoParlamentar ?? voto?.voto));
  } catch (e) { console.log("#3 falhou", e.message); }

  // 4 e 5) Cota parlamentar da Câmara 2025
  try {
    const f = await baixar("https://www.camara.leg.br/cotas/Ano-2025.csv.zip", "ceap2025.zip");
    const alvo = { "220537|9|SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO": 0, "143632|7|TELEFONIA": 0 };
    for await (const l of linhas(f, { zip: true })) {
      const k = `${l.ideCadastro}|${Number(l.numMes)}|${(l.txtDescricao ?? "").trim()}`;
      if (k in alvo && Number(l.numAno) === 2025) alvo[k] += Number(l.vlrLiquido);
    }
    res(4, "Helena Lima (C-220537) set/2025 táxi, pedágio e estacionamento", "64.74", alvo["220537|9|SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO"].toFixed(2));
    res(5, "Domingos Neto (C-143632) jul/2025 telefonia", "360.40", alvo["143632|7|TELEFONIA"].toFixed(2));
  } catch (e) { console.log("#4-5 falhou", e.message); }

  // 6) Cota do Senado 2025
  try {
    const f = await baixar("https://www.senado.gov.br/transparencia/LAI/verba/despesa_ceaps_2025.csv", "ceaps2025.csv");
    let soma = 0;
    for await (const l of linhas(f, { latin1: true, pular: 1 }))
      if (norm(l.SENADOR) === "alan rick" && Number(l.MES) === 10 && norm(l.TIPO_DESPESA).startsWith("locomocao")) soma += brl(l.VALOR_REEMBOLSADO);
    res(6, "Alan Rick (S-5672) out/2025 locomoção, hospedagem…", "7564.51", soma.toFixed(2));
  } catch (e) { console.log("#6 falhou", e.message); }

  // 7 e 8) Emendas parlamentares (Portal da Transparência)
  try {
    const f = await baixar("https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO", "emendas.zip");
    const alvo = { "202433120004": [0, 0], "202444250003": [0, 0] };
    for await (const l of linhas(f, { zip: "EmendasParlamentares.csv", latin1: true })) {
      const c = (l["Código da Emenda"] ?? "").trim();
      if (c in alvo) {
        alvo[c][0] += brl(l["Valor Empenhado"]);
        alvo[c][1] += brl(l["Valor Pago"]);
        console.log(`   linha ${c}: ${l["Nome do Autor da Emenda"]} · ${l["Localidade de aplicação do recurso"]} · emp ${l["Valor Empenhado"]} · pago ${l["Valor Pago"]}`);
      }
    }
    res(7, "Emenda 202433120004 (Helder Salomão) empenhado/pago", "700000.00/0.00", alvo["202433120004"].map((v) => v.toFixed(2)).join("/"));
    res(8, "Emenda 202444250003 (Matheus Noronha) empenhado/pago", "18785792.00/18785792.00", alvo["202444250003"].map((v) => v.toFixed(2)).join("/"));
  } catch (e) { console.log("#7-8 falhou", e.message); }

  // 9 e 10) População (IBGE, tabela 6579)
  for (const [n, ibge, nome, banco] of [[9, 2921500, "Monte Santo (BA)", 49793], [10, 4219606, "Xavantina (SC)", 3462]]) {
    try {
      const r = await fetch(`https://apisidra.ibge.gov.br/values/t/6579/n6/${ibge}/v/9324/p/last`, { headers: UA });
      const d = await r.json();
      res(n, `População de ${nome} (${d[1]?.D3N})`, banco, Number(d[1]?.V));
    } catch (e) { console.log(`#${n} falhou`, e.message); }
  }
}
