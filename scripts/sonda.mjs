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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Ligação de carreiras: nomes das colunas do deputados.csv (só o cabeçalho, nenhum valor) e ficha do senador
{
  const r = await fetch("https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv", { headers: UA });
  const leitor = r.body.getReader();
  const { value } = await leitor.read();
  await leitor.cancel();
  console.log("deputados.csv colunas:", new TextDecoder().decode(value).split("\n")[0]);
}
{
  const r = await fetch(`${S}/senador/3830.json`, { headers: { ...UA, Accept: "application/json" } });
  const d = await r.json();
  const p = d?.DetalheParlamentar?.Parlamentar ?? {};
  console.log("senador chaves:", Object.keys(p).join(","));
  console.log("Identificacao:", JSON.stringify(p.IdentificacaoParlamentar));
  console.log("DadosBasicos:", JSON.stringify(p.DadosBasicosParlamentar));
}
