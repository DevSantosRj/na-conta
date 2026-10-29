/* eslint-disable @typescript-eslint/no-unused-vars -- sonda: funções de apoio usadas em rodadas diferentes */
// Sonda das fontes oficiais (8ª rodada): fontes do pacto federativo.
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

// 8ª rodada: fontes do pacto federativo (arrecadação federal por estado e transferências constitucionais)
{
  const CK = "https://www.tesourotransparente.gov.br/ckan/api/3/action";
  for (const id of ["8add38c3-cf27-4428-940e-806548cac95c", "af4e7c47-2132-4d9a-bd7c-34e28a210b03"]) {
    try {
      const r = await fetch(`${CK}/package_show?id=${id}`, { headers: UA });
      const d = await r.json();
      console.log(`\n===== CKAN ${id}: ${d.result?.title}`);
      for (const x of d.result?.resources ?? []) console.log(`RES ${x.format} | ${x.name} | ${x.url} | ${x.last_modified ?? x.created}`);
    } catch (e) { console.log(`CKAN ${id} falhou`, e.message); }
  }
  try {
    const r = await fetch(`${CK}/package_search?q=arrecadacao&rows=30`, { headers: UA });
    const d = await r.json();
    for (const p of d.result?.results ?? []) console.log(`PKG ${p.name} | ${p.title}`);
  } catch (e) { console.log("busca ckan falhou", e.message); }
  await pagina("https://www.gov.br/receitafederal/dados", { links: /arrecad|\.csv|\.xlsx|\.zip/i, max: 500 });
  await pagina("https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/relatorios/arrecadacao-federal", { links: /arrecad|uf|estado|\.csv|\.xlsx/i, max: 500 });
  for (const u of [
    "https://www.gov.br/receitafederal/dados/arrecadacao-estado.csv",
    "https://www.gov.br/receitafederal/dados/arrecadacao-uf.csv",
    "https://dados.gov.br/dados/conjuntos-dados/resultado-da-arrecadacao-federal",
  ]) {
    try {
      const r = await fetch(u, { headers: UA, redirect: "follow" });
      const t = await r.text();
      console.log(`\n===== ${u}\nstatus ${r.status} · ${t.length} bytes · ${r.headers.get("content-type")} · final ${r.url}\n${t.slice(0, 1500)}`);
    } catch (e) { console.log(`${u} falhou`, e.message); }
  }
}
