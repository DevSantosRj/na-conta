// Sonda das fontes oficiais (3ª rodada): listas oficiais de presidentes
// da República, da Câmara e do Senado. Rodadas anteriores: histórico do git e docs/fontes.md.

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

import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("sonda-arquivos", { recursive: true });

// Guarda o arquivo original (HTML/PDF/JSON) para leitura exata fora daqui.
async function guardar(nome, url, { headers = {} } = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...headers }, redirect: "follow" });
    const b = Buffer.from(await r.arrayBuffer());
    writeFileSync(`sonda-arquivos/${nome}`, b);
    console.log(`${nome}: status ${r.status} · ${b.length} bytes · ${r.url}`);
  } catch (e) {
    console.log(`${nome}: falhou ${e.message}`);
  }
}

await guardar("camara-presidentes.html", "https://www2.camara.leg.br/a-camara/conheca/historia/presidentes");
for (const p of ["presidentes/imperio", "republica-velha", "pos-1930", "pos-1964", "nova-republica"]) {
  await guardar(`senado-${p.replace("/", "-")}.html`, `https://www25.senado.leg.br/web/senadores/${p}`);
}
await guardar("senado-mesa.json", "https://legis.senado.leg.br/dadosabertos/composicao/mesaSF.json", { headers: { Accept: "application/json" } });
for (const n of [52, 53, 54, 55, 56, 57]) {
  await guardar(`camara-mesa-${n}.json`, `https://dadosabertos.camara.leg.br/api/v2/legislaturas/${n}/mesa`, { headers: { Accept: "application/json" } });
}
await guardar("an-presidentes-deodoro-lula.pdf", "https://presidentes.an.gov.br/images/publicacoes/OsPresidenteseaRepublica.pdf");
await guardar("an-presidentes-deodoro-dilma.pdf", "https://www.gov.br/arquivonacional/pt-br/servicos/publicacoes/OspresidenteseaRepblica_DeodoroDilma.pdf");
await guardar("vice-presidentes.pdf", "https://www.gov.br/planalto/pt-br/vice-presidencia/acesso-a-informacao/institucional/biografia-dos-vice-presidentes-da-republica/biografias-vice-presidentes-versao-final.pdf");
await pagina("https://presidentes.an.gov.br/", { links: /presiden|galeria/i, max: 4000 });
