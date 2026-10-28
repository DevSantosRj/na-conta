// Sonda das fontes oficiais (4ª rodada): autoria de projetos no Senado (serviço /processo).
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const S = "https://legis.senado.leg.br/dadosabertos";

// Formato do campo "autoria" nos projetos de um senador (Davi Alcolumbre = 3830)
const r = await fetch(`${S}/processo?codigoParlamentarAutor=3830`, { headers: { ...UA, Accept: "application/json" } });
const lista = await r.json();
const projetos = lista.filter((p) => /^Proj|^Proposta/.test(p.tipoDocumento ?? ""));
console.log("total", lista.length, "projetos", projetos.length);
for (const p of projetos.filter((p) => /^PLC/.test(p.identificacao)).slice(0, 5)) console.log("PLC |", p.identificacao, "|", p.autoria);
const vistos = new Map();
for (const p of projetos) {
  const chave = (p.autoria ?? "").slice(0, 60);
  if (!vistos.has(chave)) vistos.set(chave, p.identificacao);
}
for (const [a, id] of [...vistos].slice(0, 40)) console.log("AUT |", id, "|", a);
