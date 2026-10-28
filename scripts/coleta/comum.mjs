// Peças comuns aos robôs de coleta do Na Conta.
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse";
import { Readable } from "node:stream";

export const UA = "na-conta-coleta (+https://github.com/DevSantosRj/na-conta)";

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY nos segredos do repositório.");
  process.exit(1);
}

export const db = createClient(url, chave, { auth: { persistSession: false } });

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// GET com novas tentativas (429/5xx e falhas de rede): 2 s, 4 s, 8 s, 16 s.
export async function baixar(endereco, aceitar = "application/json") {
  for (let tentativa = 0; ; tentativa++) {
    try {
      const r = await fetch(endereco, { headers: { "User-Agent": UA, Accept: aceitar } });
      if (r.ok) return r;
      if (r.status === 404) return null;
      if (!(r.status === 429 || r.status >= 500) || tentativa >= 4) throw new Error(`HTTP ${r.status} em ${endereco}`);
    } catch (e) {
      if (tentativa >= 4) throw e;
    }
    await espera(2000 * 2 ** tentativa);
  }
}

export async function baixarJson(endereco) {
  const r = await baixar(endereco);
  return r ? r.json() : null;
}

// Lê um CSV da Câmara (separador ";", UTF-8 com BOM) linha a linha, só com as colunas pedidas.
// Colunas fora da lista nunca são lidas para a memória do robô (ex.: CPF em deputados.csv).
export async function* lerCsv(endereco, colunas) {
  const r = await baixar(endereco, "text/csv");
  if (!r) return;
  const leitor = Readable.fromWeb(r.body).pipe(
    parse({ delimiter: ";", bom: true, columns: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true }),
  );
  for await (const linha of leitor) {
    const so = {};
    for (const c of colunas) so[c] = linha[c] ?? "";
    yield so;
  }
}

// Grava em lotes, sem duplicar: chaves repetidas no mesmo lote ficam com a última versão.
export async function gravar(tabela, linhas, chave, conflito) {
  const unicas = new Map();
  for (const l of linhas) unicas.set(chave(l), l);
  const todas = [...unicas.values()];
  for (let i = 0; i < todas.length; i += 1000) {
    const lote = todas.slice(i, i + 1000);
    const { error } = await db.from(tabela).upsert(lote, { onConflict: conflito });
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
  return todas.length;
}

// Registra cada execução em `coletas` (início, fim, linhas, erro).
export async function registrar(fonte, trabalho) {
  const { data, error } = await db.from("coletas").insert({ fonte, status: "rodando" }).select("id").single();
  if (error) throw new Error(`coletas: ${error.message}`);
  const inicio = Date.now();
  try {
    const linhas = await trabalho();
    await db.from("coletas").update({ status: "ok", linhas, terminada_em: new Date().toISOString() }).eq("id", data.id);
    console.log(`✔ ${fonte}: ${linhas} linhas em ${Math.round((Date.now() - inicio) / 1000)} s`);
    return linhas;
  } catch (e) {
    await db.from("coletas").update({ status: "erro", erro: String(e.message ?? e).slice(0, 2000), terminada_em: new Date().toISOString() }).eq("id", data.id);
    throw e;
  }
}

export async function idsExistentes(tabela, filtroCasa) {
  const ids = new Set();
  for (let de = 0; ; de += 1000) {
    let q = db.from(tabela).select("id").range(de, de + 999);
    if (filtroCasa) q = q.eq("casa", filtroCasa);
    const { data, error } = await q;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    data.forEach((l) => ids.add(l.id));
    if (data.length < 1000) return ids;
  }
}
