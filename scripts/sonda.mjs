/* eslint-disable @typescript-eslint/no-unused-vars -- sonda: funções de apoio usadas em rodadas diferentes */
// Sonda das fontes oficiais (9ª rodada): formato das transferências constitucionais.
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

// 9ª rodada: formato dos arquivos mensais de transferências constitucionais (estados e municípios)
{
  const CK = "https://www.tesourotransparente.gov.br/ckan/api/3/action";
  for (const [id, alvo] of [["8add38c3-cf27-4428-940e-806548cac95c", "Transferencia_Mensal_Estados_202609"], ["af4e7c47-2132-4d9a-bd7c-34e28a210b03", "Transferencia_Mensal_Municipios_202609"], ["af4e7c47-2132-4d9a-bd7c-34e28a210b03", "Transferencia_Mensal_Municipios_202512"]]) {
    const d = await (await fetch(`${CK}/package_show?id=${id}`, { headers: UA })).json();
    const nomes = (d.result?.resources ?? []).map((x) => x.name);
    console.log(`\n${id}: ${nomes.length} recursos; municipais recentes: ${nomes.filter((n) => /202[3-6]/.test(n)).join(", ").slice(0, 1500)}`);
    const r = (d.result?.resources ?? []).find((x) => x.name.startsWith(alvo));
    if (!r) { console.log(`sem ${alvo}`); continue; }
    const resp = await fetch(r.url, { headers: UA });
    const b = Buffer.from(await resp.arrayBuffer());
    const t = new TextDecoder("latin1").decode(b);
    const linhas = t.split(/\r?\n/);
    console.log(`\n===== ${alvo} · ${r.url} · ${b.length} bytes · ${linhas.length} linhas`);
    for (const l of linhas.slice(0, 8)) console.log(`  ${l.slice(0, 600)}`);
    const cols = linhas[0].split(";");
    for (let c = 0; c < cols.length; c++) {
      const vals = new Set(linhas.slice(1, 6000).map((l) => l.split(";")[c]));
      if (vals.size < 40) console.log(`  COL ${cols[c]}: ${[...vals].slice(0, 40).join(" | ")}`);
    }
  }
}
