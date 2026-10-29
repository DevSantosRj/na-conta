// Cota parlamentar: CEAP (Câmara) e CEAPS (Senado). Grava a soma por parlamentar, mês e categoria.
// Só entra quem está no banco (parlamentares atuais e as fichas ligadas da outra Casa).
// Colunas lidas: nunca o CPF do parlamentar nem o CPF/CNPJ de fornecedores.
import { db, gravar, idsExistentes, lerCsvArquivo } from "./comum.mjs";

const CAMARA = (ano) => `https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`;
const SENADO = (ano) => `https://www.senado.gov.br/transparencia/LAI/verba/despesa_ceaps_${ano}.csv`;

const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const valorBR = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

async function regravar(prefixo, ano, somas) {
  // Recalcula o ano inteiro daquela Casa: apaga as somas antigas do ano e grava as novas
  const { error } = await db.from("gastos_mensais").delete().like("parlamentar_id", `${prefixo}-%`).eq("ano", ano);
  if (error) throw new Error(`gastos_mensais: ${error.message}`);
  return gravar("gastos_mensais", [...somas.values()], (l) => `${l.parlamentar_id}|${l.ano}|${l.mes}|${l.categoria}`, "parlamentar_id,ano,mes,categoria");
}

function somar(somas, pid, ano, mes, categoria, valor, fonte) {
  const k = `${pid}|${ano}|${mes}|${categoria}`;
  const s = somas.get(k) ?? { parlamentar_id: pid, ano, mes, categoria, valor: 0, documentos: 0, fonte_url: fonte };
  s.valor = Math.round((s.valor + valor) * 100) / 100;
  s.documentos++;
  somas.set(k, s);
}

export async function camara(ano) {
  const ids = await idsExistentes("parlamentares", "camara");
  const somas = new Map();
  let linhas = 0;
  for await (const l of lerCsvArquivo(CAMARA(ano), ["nuDeputadoId", "numAno", "numMes", "txtDescricao", "vlrLiquido"], { zip: true })) {
    linhas++;
    const pid = `C-${l.nuDeputadoId}`;
    if (!l.nuDeputadoId || !ids.has(pid) || Number(l.numAno) !== ano) continue;
    const mes = Number(l.numMes);
    const valor = Number(l.vlrLiquido);
    if (!(mes >= 1 && mes <= 12) || !Number.isFinite(valor)) continue;
    somar(somas, pid, ano, mes, l.txtDescricao.trim(), valor, CAMARA(ano));
  }
  if (!linhas) return 0;
  return regravar("C", ano, somas);
}

export async function senado(ano) {
  const { data, error } = await db.from("parlamentares").select("id, nome_parlamentar").eq("casa", "senado");
  if (error) throw new Error(`parlamentares: ${error.message}`);
  const porNome = new Map();
  const repetidos = new Set();
  for (const p of data) {
    const k = norm(p.nome_parlamentar);
    if (porNome.has(k)) repetidos.add(k);
    porNome.set(k, p.id);
  }
  const somas = new Map();
  const semFicha = new Set();
  let linhas = 0;
  for await (const l of lerCsvArquivo(SENADO(ano), ["ANO", "MES", "SENADOR", "TIPO_DESPESA", "VALOR_REEMBOLSADO"], { latin1: true, pularLinhas: 1 })) {
    linhas++;
    const k = norm(l.SENADOR);
    const pid = repetidos.has(k) ? null : porNome.get(k);
    if (!pid) {
      semFicha.add(l.SENADOR);
      continue;
    }
    const mes = Number(l.MES);
    const valor = valorBR(l.VALOR_REEMBOLSADO);
    if (!(mes >= 1 && mes <= 12) || !Number.isFinite(valor) || Number(l.ANO) !== ano) continue;
    somar(somas, pid, ano, mes, l.TIPO_DESPESA.trim(), valor, SENADO(ano));
  }
  if (!linhas) return 0;
  if (semFicha.size) console.log(`  ${ano}: ${semFicha.size} nome(s) do Senado sem ficha no banco (ex-senadores fora do recorte)`);
  return regravar("S", ano, somas);
}
