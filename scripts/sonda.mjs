/* eslint-disable @typescript-eslint/no-unused-vars -- sonda: funções de apoio usadas em rodadas diferentes */
// Sonda das fontes oficiais (10ª rodada): diagnóstico dos arquivos de transferências.
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

// 10ª rodada: diagnóstico arquivo a arquivo das transferências (mês de referência, formato dos números)
{
  const CK = "https://www.tesourotransparente.gov.br/ckan/api/3/action";
  for (const [id, rot] of [["8add38c3-cf27-4428-940e-806548cac95c", "Estados"], ["af4e7c47-2132-4d9a-bd7c-34e28a210b03", "Municipios"]]) {
    const d = await (await fetch(`${CK}/package_show?id=${id}`, { headers: UA })).json();
    const res = (d.result?.resources ?? []).filter((x) => /Mensal/.test(x.name) && /20(19|2\d)/.test(x.name));
    console.log(`\n===== ${rot}: ${res.length} arquivos`);
    for (const r of res) {
      try {
        const b = Buffer.from(await (await fetch(r.url, { headers: UA })).arrayBuffer());
        const t = new TextDecoder("latin1").decode(b).split(/\r?\n/);
        const cab = t[0];
        const meses = new Map();
        let amostra = "";
        for (const l of t.slice(1)) {
          const c = l.split(";");
          if (c.length < 6) continue;
          const off = rot === "Municipios" ? 1 : 0;
          const k = `${c[1 + off]}-${c[2 + off]}`;
          meses.set(k, (meses.get(k) ?? 0) + 1);
          if (!amostra && c[off] === "SP" && /^FP[EM]$/.test(c[6 + off])) amostra = l.slice(0, 160);
          if (!amostra && rot === "Municipios" && c[1] === "SP" && c[7] === "FPM") amostra = l.slice(0, 160);
        }
        console.log(`${r.name} | ${(r.last_modified ?? r.created ?? "").slice(0, 10)} | ${[...meses].map(([k, n]) => `${k}:${n}`).join(" ")} | cab ${cab.slice(0, 90)} | ex ${amostra}`);
      } catch (e) { console.log(`${r.name} falhou ${e.message}`); }
    }
  }
}
