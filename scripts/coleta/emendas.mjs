// Emendas parlamentares: download em lote do Portal da Transparência (não precisa de token).
// Uma linha por emenda × localidade × ação, como no arquivo oficial. O autor é ligado ao parlamentar
// do banco só quando o nome corresponde a uma única pessoa (as fichas ligadas Câmara/Senado contam como a mesma).
import { createHash } from "node:crypto";
import { db, gravar, idsExistentes, lerCsvArquivo } from "./comum.mjs";
import { UF } from "./ibge.mjs";

const ARQUIVO =
  "https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO";
const FONTE =
  "https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares";

const COLUNAS = [
  "Código da Emenda",
  "Ano da Emenda",
  "Tipo de Emenda",
  "Código do Autor da Emenda",
  "Nome do Autor da Emenda",
  "Número da emenda",
  "Localidade de aplicação do recurso",
  "Código Município IBGE",
  "Código UF IBGE",
  "Nome Função",
  "Código Ação",
  "Nome Ação",
  "Código Plano Orçamentário",
  "Valor Empenhado",
  "Valor Liquidado",
  "Valor Pago",
  "Valor Restos A Pagar Pagos",
];

const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const valorBR = (s) => {
  const n = Number(
    String(s ?? "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : 0;
};
const vazio = (s) => !s || /^(sem informa|s\/i$)/i.test(s.trim());

async function mapaAutores() {
  const pessoas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db
      .from("parlamentares")
      .select("id, nome_parlamentar, outra_casa_id")
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(`parlamentares: ${error.message}`);
    pessoas.push(...data);
    if (data.length < 1000) break;
  }
  // nome → conjunto de "pessoas" (a ficha da Câmara e a do Senado da mesma pessoa contam como uma)
  const porNome = new Map();
  for (const p of pessoas) {
    const k = norm(p.nome_parlamentar);
    const pessoa = [p.id, p.outra_casa_id].filter(Boolean).sort()[0];
    const atual = porNome.get(k) ?? new Map();
    atual.set(pessoa, atual.get(pessoa) ?? p.id);
    // Prefere a ficha ativa/atual: a de id "S-" ou "C-" tanto faz para o perfil, que junta as duas
    porNome.set(k, atual);
  }
  const unico = new Map();
  for (const [k, m] of porNome)
    if (m.size === 1) unico.set(k, [...m.values()][0]);
  return unico;
}

export async function carregar() {
  const autores = await mapaAutores();
  const municipios = await idsExistentes("municipios", null, "ibge_id");
  const linhas = new Map();
  for await (const l of lerCsvArquivo(ARQUIVO, COLUNAS, {
    zip: true,
    noZip: "EmendasParlamentares.csv",
    latin1: true,
  })) {
    const codigo = vazio(l["Código da Emenda"])
      ? null
      : l["Código da Emenda"].trim();
    const ano = Number(l["Ano da Emenda"]);
    if (!ano) continue;
    const chave = [
      codigo ??
        `${ano}-${l["Código do Autor da Emenda"]}-${l["Número da emenda"]}`,
      l["Localidade de aplicação do recurso"],
      l["Código Município IBGE"],
      l["Código Ação"],
      l["Código Plano Orçamentário"],
    ].join("|");
    const id = createHash("sha1").update(chave).digest("hex").slice(0, 20);
    const autor = vazio(l["Nome do Autor da Emenda"])
      ? null
      : l["Nome do Autor da Emenda"].trim();
    const mun = Number(l["Código Município IBGE"]);
    const ufCod = Number(String(l["Código UF IBGE"]).slice(0, 2));
    const atual = linhas.get(id);
    const linha = atual ?? {
      id,
      codigo: codigo ?? "",
      ano,
      tipo: l["Tipo de Emenda"].trim() || null,
      autor,
      autor_codigo: vazio(l["Código do Autor da Emenda"])
        ? null
        : l["Código do Autor da Emenda"].trim(),
      numero: vazio(l["Número da emenda"])
        ? null
        : l["Número da emenda"].trim(),
      parlamentar_id: autor ? (autores.get(norm(autor)) ?? null) : null,
      uf: UF[ufCod] ?? null,
      municipio_id: municipios.has(mun) ? mun : null,
      localidade: l["Localidade de aplicação do recurso"].trim() || null,
      funcao: l["Nome Função"].trim() || null,
      acao: l["Nome Ação"].trim() || null,
      valor_empenhado: 0,
      valor_liquidado: 0,
      valor_pago: 0,
      valor_rap_pago: 0,
      fonte_url: FONTE,
    };
    // Linhas repetidas no arquivo (mesma emenda, localidade e ação) são somadas
    linha.valor_empenhado =
      Math.round(
        (linha.valor_empenhado + valorBR(l["Valor Empenhado"])) * 100,
      ) / 100;
    linha.valor_liquidado =
      Math.round(
        (linha.valor_liquidado + valorBR(l["Valor Liquidado"])) * 100,
      ) / 100;
    linha.valor_pago =
      Math.round((linha.valor_pago + valorBR(l["Valor Pago"])) * 100) / 100;
    linha.valor_rap_pago =
      Math.round(
        (linha.valor_rap_pago + valorBR(l["Valor Restos A Pagar Pagos"])) * 100,
      ) / 100;
    linhas.set(id, linha);
  }
  if (linhas.size < 10000)
    throw new Error(`arquivo de emendas suspeito: só ${linhas.size} linhas`);
  const n = await gravar("emendas", [...linhas.values()], (l) => l.id, "id");

  // O que saiu do arquivo oficial sai do banco
  const existentes = await idsExistentes("emendas", null);
  const sobrando = [...existentes].filter((id) => !linhas.has(id));
  for (let i = 0; i < sobrando.length; i += 500) {
    const { error } = await db
      .from("emendas")
      .delete()
      .in("id", sobrando.slice(i, i + 500));
    if (error) throw new Error(`emendas: ${error.message}`);
  }
  if (sobrando.length)
    console.log(
      `  ${sobrando.length} emenda(s) fora do arquivo oficial removida(s)`,
    );
  return n;
}
