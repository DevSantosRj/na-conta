/* eslint-disable @typescript-eslint/no-unused-vars -- sonda: funções de apoio usadas em rodadas diferentes */
// Sonda das fontes oficiais (6ª rodada): tabelas oficiais de IR e INSS de 2026 (Meu imposto).
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

// Tabelas oficiais para o Meu imposto: guarda as páginas inteiras
{
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("sonda-arquivos", { recursive: true });
  const paginas = {
    "receita-2026.html": "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026",
    "lei-15270.htm": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm",
    "inss-tabela.html": "https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal",
  };
  for (const [nome, url] of Object.entries(paginas)) {
    try {
      const r = await fetch(url, { headers: { ...UA, Accept: "text/html" }, redirect: "follow" });
      const b = Buffer.from(await r.arrayBuffer());
      writeFileSync(`sonda-arquivos/${nome}`, b);
      console.log(`${nome}: status ${r.status} · ${b.length} bytes`);
    } catch (e) {
      console.log(`${nome}: falhou ${e.message} ${e.cause?.code ?? ""}`);
    }
  }
}
