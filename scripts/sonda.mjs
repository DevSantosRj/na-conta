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

// 1) Documentação oficial: caminhos que falam de processo/autoria
try {
  const r = await fetch(`${S}/v3/api-docs`, { headers: { ...UA, Accept: "application/json" } });
  console.log("api-docs status", r.status);
  if (r.ok) {
    const doc = await r.json();
    for (const [caminho, ops] of Object.entries(doc.paths ?? {})) {
      if (/process|autor|materia|senador\/\{/i.test(caminho)) {
        const g = ops.get ?? {};
        console.log(`PATH ${caminho} | ${g.summary ?? ""} | params: ${(g.parameters ?? []).map((p) => p.name).join(",")}${g.deprecated ? " | DEPRECIADO" : ""}`);
      }
    }
  }
} catch (e) {
  console.log("api-docs falhou", e.message);
}

// 2) Tentativas com um senador conhecido (Renan Calheiros = 70)
await json(`${S}/processo?codigoParlamentarAutor=70&dataInicioApresentacao=2025-01-01&dataFimApresentacao=2025-12-31`);
await json(`${S}/processo?codigoParlamentarAutor=70`);
await json(`${S}/processo?autor=70&sigla=PL&ano=2025`);
await json(`${S}/senador/70/autorias.json`);
await json(`${S}/processo?sigla=PL&ano=2025&numero=1`);
