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

// Senado: páginas oficiais por período + Mesa atual
for (const p of ["presidentes/imperio", "republica-velha", "pos-1930", "pos-1964", "nova-republica"]) {
  await pagina(`https://www25.senado.leg.br/web/senadores/${p}`, { max: 6000 });
}
await json("https://legis.senado.leg.br/dadosabertos/composicao/mesaSF.json");

// Câmara: galeria oficial de presidentes + Mesa de cada legislatura (API)
await pagina("https://www2.camara.leg.br/a-camara/presidencia/galeria-presidentes", { links: /galeria-presidentes\/|Ex_presidentes/i });
await pagina("https://www2.camara.leg.br/a-camara/conheca/historia/Ex_presidentesCD_Republica", { links: /Ex_presidentes|presiden/i });
for (const n of [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57]) {
  await json(`https://dadosabertos.camara.leg.br/api/v2/legislaturas/${n}/mesa`);
}

// Presidência da República: Biblioteca da Presidência e Arquivo Nacional
await pagina("https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-presidencia", { links: /presiden/i, max: 3000 });
await pagina("https://www.biblioteca.presidencia.gov.br/presidencia/ex-presidentes", { links: /presiden/i, max: 8000 });
await pagina("https://www.gov.br/planalto/pt-br/conheca-a-presidencia/acervo/galeria-de-ex-presidentes", { links: /presiden/i, max: 8000 });
