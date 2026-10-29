// Pacto federativo.
// 1) Arrecadação federal por estado: Receita Federal, arrecadacao-estado.csv (valores mensais por tributo e UF).
// 2) Transferências constitucionais da União: Tesouro Transparente, arquivos mensais para estados e para municípios.
import { baixarJson, db, gravar, lerCsvArquivo } from "./comum.mjs";
import { UF } from "./ibge.mjs";

const ARRECADACAO = "https://www.gov.br/receitafederal/dados/arrecadacao-estado.csv";
const CKAN = "https://www.tesourotransparente.gov.br/ckan/api/3/action/package_show?id=";
const PACOTE = { estado: "8add38c3-cf27-4428-940e-806548cac95c", municipios: "af4e7c47-2132-4d9a-bd7c-34e28a210b03" };
const PAGINA = {
  estado: "https://www.tesourotransparente.gov.br/ckan/dataset/transferencias-constitucionais-para-estados",
  municipios: "https://www.tesourotransparente.gov.br/ckan/dataset/transferencias-constitucionais-para-municipios",
};
const SIGLAS = new Set(Object.values(UF));
const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const numero = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t) || 0;
};
const centavos = (v) => Math.round(v * 100) / 100;

// Itens do FUNDEB que vêm de impostos do próprio estado, e DEDU (origem não identificada): não entram como dinheiro da União
export const ITENS_ESTADUAIS = new Set(["ICMS", "IPVA", "ITCMD", "ICME", "DEDU"]);

export async function arrecadacao() {
  const somas = new Map(); // uf|ano -> { valor, meses:Set }
  const totaisColuna = new Map(); // conferência: total nacional por coluna no último ano completo
  let colunas = null;
  let agregadas = null;
  for await (const l of lerCsvArquivo(ARRECADACAO, ["Ano", "UF"], { latin1: true, todasAsColunas: true })) {
    if (!colunas) {
      colunas = Object.keys(l).filter((c) => !["Ano", "UF"].includes(c) && !/^m.s$/i.test(c) && c.trim());
      // Coluna "COFINS" convive com "COFINS - FINANCEIRAS"/"COFINS - DEMAIS": a soma usa as partes quando existem
      agregadas = new Map(colunas.map((c) => [c, colunas.filter((x) => x.startsWith(`${c} - `))]).filter(([, partes]) => partes.length));
      console.log(`  colunas de tributo: ${colunas.length} · agregadas: ${[...agregadas.keys()].join(", ")}`);
    }
    const uf = (l.UF ?? "").trim();
    const ano = Number(l.Ano);
    const mesNome = norm(Object.entries(l).find(([k]) => /^m.s$/i.test(k))?.[1]);
    const mes = MESES.indexOf(mesNome) + 1;
    if (!SIGLAS.has(uf) || !ano || !mes) continue;
    let total = 0;
    for (const c of colunas) {
      const partes = agregadas.get(c);
      if (partes && partes.some((p) => String(l[p] ?? "").trim() !== "")) continue;
      const v = numero(l[c]);
      total += v;
      if (ano === new Date().getFullYear() - 1) totaisColuna.set(c, (totaisColuna.get(c) ?? 0) + v);
    }
    const k = `${uf}|${ano}`;
    const s = somas.get(k) ?? { uf, ano, valor: 0, meses: new Set() };
    s.valor += total;
    s.meses.add(mes);
    somas.set(k, s);
  }
  if (!somas.size) throw new Error("arrecadação: nenhuma linha lida");
  const ultimo = new Date().getFullYear() - 1;
  const nacional = [...somas.values()].filter((s) => s.ano === ultimo).reduce((a, s) => a + s.valor, 0);
  console.log(`  total nacional ${ultimo}: R$ ${(nacional / 1e9).toFixed(1)} bilhões`);
  for (const [c, v] of [...totaisColuna].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`    ${c}: R$ ${(v / 1e9).toFixed(1)} bi`);
  const linhas = [...somas.values()].map((s) => ({ uf: s.uf, ano: s.ano, meses: s.meses.size, valor: centavos(s.valor), fonte_url: ARRECADACAO }));
  return gravar("arrecadacao", linhas, (l) => `${l.uf}|${l.ano}`, "uf,ano");
}

// Lê os arquivos mensais do Tesouro a partir de `desde` (ano). Cada mês fica com o arquivo publicado por último.
async function arquivosMensais(destino, desde) {
  const pacote = await baixarJson(`${CKAN}${PACOTE[destino]}`);
  const rotulo = destino === "estado" ? "Estados" : "Municipios";
  const re = new RegExp(`^Transferencia_Mensal_${rotulo}_(\\d{4})(\\d{2})`);
  return (pacote?.result?.resources ?? [])
    .map((r) => ({ url: r.url, nome: r.name, quando: r.last_modified ?? r.created ?? "", m: re.exec(r.name ?? "") }))
    .filter((r) => r.m && Number(r.m[1]) >= desde)
    .sort((a, b) => a.quando.localeCompare(b.quando));
}

export async function transferencias({ desde = 2019 } = {}) {
  const porUf = new Map(); // uf|ano|destino|tipo -> valor
  const mesesPorUf = new Map(); // uf|ano|destino -> Set(mes)
  const porMunicipio = new Map(); // nome|uf|ano -> { fpm, federal, meses:Set }
  const conferencia = new Map();
  let total = 0;
  for (const destino of ["estado", "municipios"]) {
    // mês de referência -> conteúdo do arquivo mais recente que o cobre
    const meses = new Map();
    for (const arq of await arquivosMensais(destino, desde)) {
      const linhas = [];
      const colunas = destino === "estado" ? ["UF", "ANO", "Item transferência", "Transferência"] : ["Município", "UF", "ANO", "Item transferência", "Transferência"];
      try {
        for await (const l of lerCsvArquivo(arq.url, colunas, { latin1: true, todasAsColunas: true })) linhas.push(l);
      } catch (e) {
        console.log(`  ! ${arq.nome}: ${e.message.slice(0, 300)}`);
        continue;
      }
      // Alguns arquivos (ex.: setembro de 2024) vêm em centavos, sem separador decimal em nenhum valor
      const decendios = linhas.length ? Object.keys(linhas[0]).filter((k) => /dec.ndio/i.test(k)) : [];
      const emCentavos = linhas.length > 0 && !linhas.some((l) => decendios.some((k) => /[.,]/.test(String(l[k] ?? ""))));
      if (emCentavos) {
        console.log(`  ${arq.nome}: valores em centavos, convertidos para reais`);
        for (const l of linhas) for (const k of decendios) l[k] = String(numero(l[k]) / 100);
      }
      const porMes = new Map();
      for (const l of linhas) {
        const mesCol = Object.keys(l).find((k) => /^m.s$/i.test(k));
        const chave = `${Number(l.ANO)}-${Number(l[mesCol])}`;
        if (!porMes.has(chave)) porMes.set(chave, []);
        porMes.get(chave).push(l);
      }
      for (const [chave, ls] of porMes) meses.set(chave, { arq, ls });
      total += linhas.length;
    }
    console.log(`  ${destino}: ${meses.size} mês(es) de referência`);
    for (const [chave, { ls }] of meses) {
      const [ano, mes] = chave.split("-").map(Number);
      if (!ano || !mes || ano < desde) continue;
      for (const l of ls) {
        const uf = (l.UF ?? "").trim();
        if (!SIGLAS.has(uf)) continue;
        const dec = Object.keys(l).filter((k) => /dec.ndio/i.test(k));
        const valor = dec.reduce((a, k) => a + numero(l[k]), 0);
        const item = (l["Item transferência"] ?? "").trim();
        const transf = (l["Transferência"] ?? "").trim();
        const tipo = `${transf} · ${item}`;
        const k = `${uf}|${ano}|${destino}|${tipo}`;
        porUf.set(k, (porUf.get(k) ?? 0) + valor);
        const km = `${uf}|${ano}|${destino}`;
        if (!mesesPorUf.has(km)) mesesPorUf.set(km, new Set());
        mesesPorUf.get(km).add(mes);
        if (ano === new Date().getFullYear() - 1) conferencia.set(`${destino} ${tipo}`, (conferencia.get(`${destino} ${tipo}`) ?? 0) + valor);
        if (destino === "municipios") {
          const kmun = `${norm(l["Município"])}|${uf}|${ano}`;
          const m = porMunicipio.get(kmun) ?? { fpm: 0, federal: 0, meses: new Set() };
          if (transf === "FPM" && item === "FPM") m.fpm += valor;
          if (!ITENS_ESTADUAIS.has(item)) m.federal += valor;
          m.meses.add(mes);
          porMunicipio.set(kmun, m);
        }
      }
    }
  }
  const ultimo = new Date().getFullYear() - 1;
  console.log(`  conferência ${ultimo} (R$ bilhões):`);
  for (const [k, v] of [...conferencia].sort((a, b) => b[1] - a[1])) console.log(`    ${k}: ${(v / 1e9).toFixed(2)}`);

  const linhas = [...porUf].map(([k, valor]) => {
    const [uf, ano, destino, tipo] = k.split("|");
    return { uf, ano: Number(ano), destino, tipo, valor: centavos(valor), meses: mesesPorUf.get(`${uf}|${ano}|${destino}`).size, fonte_url: PAGINA[destino] };
  });
  let n = await gravar("transferencias", linhas, (l) => `${l.uf}|${l.ano}|${l.destino}|${l.tipo}`, "uf,ano,destino,tipo");

  // Prefeituras: o arquivo traz o nome do município; liga pelo nome + UF ao cadastro do IBGE
  const cadastro = new Map();
  for (let i = 0; ; i += 1000) {
    const { data, error } = await db.from("municipios").select("ibge_id, nome, uf").range(i, i + 999);
    if (error) throw new Error(`municipios: ${error.message}`);
    for (const m of data) cadastro.set(`${norm(m.nome)}|${m.uf}`, m.ibge_id);
    if (data.length < 1000) break;
  }
  const semCadastro = new Set();
  const mun = [];
  for (const [k, v] of porMunicipio) {
    const [nome, uf, ano] = k.split("|");
    const id = cadastro.get(`${nome}|${uf}`);
    if (!id) {
      semCadastro.add(`${nome}/${uf}`);
      continue;
    }
    mun.push({ municipio_id: id, ano: Number(ano), meses: v.meses.size, fpm: centavos(v.fpm), federal: centavos(v.federal), fonte_url: PAGINA.municipios });
  }
  console.log(`  municípios ligados: ${new Set(mun.map((m) => m.municipio_id)).size} · sem cadastro: ${semCadastro.size} ${[...semCadastro].slice(0, 30).join(", ")}`);
  n += await gravar("transferencias_municipios", mun, (l) => `${l.municipio_id}|${l.ano}`, "municipio_id,ano");
  console.log(`  ${total} linhas lidas dos arquivos do Tesouro`);
  return n;
}
