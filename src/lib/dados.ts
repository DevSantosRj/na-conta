import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabasePublico as db } from "./supabase/publico";
import type { Voto } from "./formato";

// Os robôs atualizam o banco de madrugada; as páginas guardam o resultado por algumas horas.

export const POR_PAGINA = 20;

export type Parlamentar = {
  id: string;
  casa: "camara" | "senado";
  nome_parlamentar: string;
  nome_civil: string;
  uf: string;
  partido_atual: string | null;
  foto_url: string | null;
  ativo: boolean;
  fonte_url: string;
  outra_casa_id: string | null;
};

export async function listarParlamentares() {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares");
  const todos: Omit<Parlamentar, "nome_civil" | "fonte_url" | "outra_casa_id">[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db
      .from("parlamentares")
      .select("id, casa, nome_parlamentar, uf, partido_atual, foto_url, ativo")
      .order("nome_parlamentar")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    todos.push(...(data as typeof todos));
    if (data.length < 1000) return todos;
  }
}

export async function buscarParlamentar(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`parlamentar-${id}`);
  const { data, error } = await db.from("parlamentares").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Parlamentar | null;
}

// As funções abaixo recebem os ids da mesma pessoa nas duas Casas (ficha da Câmara e do Senado ligadas)
export async function mandatos(ids: string[]) {
  "use cache";
  cacheLife("days");
  const { data, error } = await db
    .from("mandatos")
    .select("casa, legislatura, uf, partido, inicio, fim")
    .in("parlamentar_id", ids)
    .order("legislatura", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Quantos votos de cada tipo o parlamentar tem registrados
export async function resumoVotos(ids: string[]) {
  "use cache";
  cacheLife("hours");
  ids.forEach((id) => cacheTag(`parlamentar-${id}`));
  const tipos: Voto[] = ["sim", "nao", "abstencao", "obstrucao", "ausente", "outro"];
  const contagens = await Promise.all(
    tipos.map(async (voto) => {
      const { count, error } = await db.from("votos").select("votacao_id", { count: "exact", head: true }).in("parlamentar_id", ids).eq("voto", voto);
      if (error) throw new Error(error.message);
      return [voto, count ?? 0] as const;
    }),
  );
  const porTipo = Object.fromEntries(contagens) as Record<Voto, number>;
  const total = contagens.reduce((s, [, n]) => s + n, 0);
  const { count: proposicoes } = await db.from("autorias").select("proposicao_id", { count: "exact", head: true }).in("parlamentar_id", ids).eq("papel", "autor");
  return { porTipo, total, proposicoes: proposicoes ?? 0 };
}

export type LinhaVoto = {
  casa: "camara" | "senado";
  voto: Voto;
  voto_original: string | null;
  votacao_id: string;
  data: string;
  descricao: string;
  resultado: string;
  placar_sim: number | null;
  placar_nao: number | null;
  fonte_url: string;
  proposicao_id: string | null;
  proposicao_tipo: string | null;
  proposicao_numero: number | null;
  proposicao_ano: number | null;
  proposicao_ementa: string | null;
  proposicao_resumo: string | null;
};

export async function votosDoParlamentar(ids: string[], pagina: number) {
  "use cache";
  cacheLife("hours");
  ids.forEach((id) => cacheTag(`parlamentar-${id}`));
  const de = (pagina - 1) * POR_PAGINA;
  const { data, count, error } = await db
    .from("votos_detalhados")
    .select("*", { count: "exact" })
    .in("parlamentar_id", ids)
    .order("data", { ascending: false })
    .order("votacao_id", { ascending: false })
    .range(de, de + POR_PAGINA - 1);
  // Página além do fim (ex.: link antigo com ?pagina=999): lista vazia em vez de erro.
  if (error?.code === "PGRST103") return { linhas: [] as LinhaVoto[], total: 0 };
  if (error) throw new Error(error.message);
  return { linhas: data as LinhaVoto[], total: count ?? 0 };
}

export type LinhaProposicao = {
  casa: "camara" | "senado";
  papel: "autor" | "coautor";
  proposicao_id: string;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string;
  resumo_ia: string | null;
  situacao: string;
  apresentada_em: string;
  fonte_url: string;
};

export async function proposicoesDoParlamentar(ids: string[], pagina: number) {
  "use cache";
  cacheLife("hours");
  ids.forEach((id) => cacheTag(`parlamentar-${id}`));
  const de = (pagina - 1) * POR_PAGINA;
  const { data, count, error } = await db
    .from("autorias_detalhadas")
    .select("*", { count: "exact" })
    .in("parlamentar_id", ids)
    .order("apresentada_em", { ascending: false })
    .order("proposicao_id", { ascending: false })
    .range(de, de + POR_PAGINA - 1);
  if (error?.code === "PGRST103") return { linhas: [] as LinhaProposicao[], total: 0 };
  if (error) throw new Error(error.message);
  return { linhas: data as LinhaProposicao[], total: count ?? 0 };
}

export async function buscarVotacao(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`votacao-${id}`);
  const { data: votacao, error } = await db.from("votacoes").select("*, proposicoes(id, tipo, numero, ano, ementa, resumo_ia, fonte_url)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!votacao) return null;
  const votos: { voto: Voto; voto_original: string | null; parlamentares: { id: string; nome_parlamentar: string; partido_atual: string | null; uf: string } }[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error: e } = await db
      .from("votos")
      .select("voto, voto_original, parlamentares(id, nome_parlamentar, partido_atual, uf)")
      .eq("votacao_id", id)
      .order("parlamentar_id")
      .range(de, de + 999);
    if (e) throw new Error(e.message);
    votos.push(...(data as unknown as typeof votos));
    if (data.length < 1000) break;
  }
  const { data: orientacoes } = await db.from("orientacoes").select("partido, orientacao").eq("votacao_id", id).order("partido");
  return { votacao, votos, orientacoes: orientacoes ?? [] };
}

export type Presidencia = {
  cargo: "republica" | "camara" | "senado";
  ordem: number;
  periodo: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  inicio: string | null;
  fim: string | null;
  ano_inicio: number;
  ano_fim: number | null;
  observacao: string | null;
  parlamentar_id: string | null;
  fonte_url: string;
};

// Listas oficiais de presidentes (atualizadas a cada eleição das Mesas ou posse presidencial)
export async function presidencias() {
  "use cache";
  cacheLife("days");
  cacheTag("presidencias");
  const { data, error } = await db.from("presidencias").select("*").order("cargo").order("ordem", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Presidencia[];
}

export async function presidenciasDoParlamentar(ids: string[]) {
  "use cache";
  cacheLife("days");
  cacheTag("presidencias");
  const { data, error } = await db.from("presidencias").select("cargo, ano_inicio, ano_fim, inicio, fim").in("parlamentar_id", ids).order("ordem");
  if (error) throw new Error(error.message);
  return data as Pick<Presidencia, "cargo" | "ano_inicio" | "ano_fim" | "inicio" | "fim">[];
}

export type EstadoInfo = {
  uf: string;
  nome: string;
  regiao: string;
  populacao: number | null;
  populacao_ano: number | null;
  cadeiras_camara: number;
  fonte_url: string;
};

export async function estados() {
  "use cache";
  cacheLife("days");
  cacheTag("estados");
  const { data, error } = await db.from("estados").select("uf, nome, regiao, populacao, populacao_ano, cadeiras_camara, fonte_url").order("nome");
  if (error) throw new Error(error.message);
  return data as EstadoInfo[];
}

export type LinhaGasto = { parlamentar_id: string; ano: number; mes: number; categoria: string; valor: number; documentos: number; fonte_url: string };

// Cota parlamentar: somas por mês (desde 2023) ou por ano (mes = 0, até 2022)
export async function gastosDoParlamentar(ids: string[]) {
  "use cache";
  cacheLife("hours");
  ids.forEach((id) => cacheTag(`parlamentar-${id}`));
  const linhas: LinhaGasto[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db
      .from("gastos_mensais")
      .select("parlamentar_id, ano, mes, categoria, valor, documentos, fonte_url")
      .in("parlamentar_id", ids)
      .order("ano", { ascending: false })
      .order("mes")
      .order("categoria")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...(data as LinhaGasto[]).map((l) => ({ ...l, valor: Number(l.valor) })));
    if (data.length < 1000) return linhas;
  }
}

export type LinhaEmenda = {
  id: string;
  codigo: string;
  ano: number;
  tipo: string | null;
  autor: string | null;
  parlamentar_id: string | null;
  uf: string | null;
  municipio_id: number | null;
  localidade: string | null;
  funcao: string | null;
  acao: string | null;
  valor_empenhado: number;
  valor_pago: number;
  valor_rap_pago: number;
  fonte_url: string;
};

const COLUNAS_EMENDA =
  "id, codigo, ano, tipo, autor, parlamentar_id, uf, municipio_id, localidade, funcao, acao, valor_empenhado, valor_pago, valor_rap_pago, fonte_url";

async function todasEmendas(filtro: (q: ReturnType<typeof consultaEmendas>) => ReturnType<typeof consultaEmendas>) {
  const linhas: LinhaEmenda[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtro(consultaEmendas()).order("ano", { ascending: false }).order("id").range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(
      ...(data as LinhaEmenda[]).map((l) => ({
        ...l,
        valor_empenhado: Number(l.valor_empenhado),
        valor_pago: Number(l.valor_pago),
        valor_rap_pago: Number(l.valor_rap_pago),
      })),
    );
    if (data.length < 1000) return linhas;
  }
}
function consultaEmendas() {
  return db.from("emendas").select(COLUNAS_EMENDA);
}

export async function emendasDoParlamentar(ids: string[]) {
  "use cache";
  cacheLife("hours");
  ids.forEach((id) => cacheTag(`parlamentar-${id}`));
  return todasEmendas((q) => q.in("parlamentar_id", ids));
}

export type Municipio = { ibge_id: number; nome: string; uf: string; populacao: number | null; populacao_ano: number | null; fonte_url: string };

export async function municipio(ibge: number) {
  "use cache";
  cacheLife("days");
  const { data, error } = await db.from("municipios").select("ibge_id, nome, uf, populacao, populacao_ano, fonte_url").eq("ibge_id", ibge).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Municipio | null;
}

export async function nomesDeMunicipios(ibges: number[]) {
  "use cache";
  cacheLife("days");
  const mapa: Record<number, string> = {};
  for (let i = 0; i < ibges.length; i += 300) {
    const { data, error } = await db.from("municipios").select("ibge_id, nome").in("ibge_id", ibges.slice(i, i + 300));
    if (error) throw new Error(error.message);
    for (const m of data) mapa[m.ibge_id] = m.nome;
  }
  return mapa;
}

export async function municipiosDoEstado(uf: string) {
  "use cache";
  cacheLife("days");
  const lista: Pick<Municipio, "ibge_id" | "nome">[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from("municipios").select("ibge_id, nome").eq("uf", uf).order("nome").range(de, de + 999);
    if (error) throw new Error(error.message);
    lista.push(...data);
    if (data.length < 1000) return lista;
  }
}

export async function emendasDoMunicipio(ibge: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas");
  return todasEmendas((q) => q.eq("municipio_id", ibge));
}

export async function emendasDoEstado(uf: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas");
  const [porAno, porMunicipio] = await Promise.all([
    db.from("emendas_por_uf_ano").select("ano, emendas, empenhado, pago").eq("uf", uf).order("ano", { ascending: false }),
    db.from("emendas_por_municipio").select("municipio_id, emendas, empenhado, pago").eq("uf", uf).order("empenhado", { ascending: false }).limit(15),
  ]);
  if (porAno.error) throw new Error(porAno.error.message);
  if (porMunicipio.error) throw new Error(porMunicipio.error.message);
  const n = (v: unknown) => Number(v);
  return {
    porAno: porAno.data.map((l) => ({ ano: l.ano as number, emendas: n(l.emendas), empenhado: n(l.empenhado), pago: n(l.pago) })),
    porMunicipio: porMunicipio.data.map((l) => ({ municipio_id: l.municipio_id as number, emendas: n(l.emendas), empenhado: n(l.empenhado), pago: n(l.pago) })),
  };
}

export async function concordancia(a: string[], b: string[]) {
  "use cache";
  cacheLife("hours");
  const { data, error } = await db.rpc("concordancia", { a, b });
  if (error) throw new Error(error.message);
  const l = (data as { comuns: number; iguais: number }[])[0] ?? { comuns: 0, iguais: 0 };
  return { comuns: Number(l.comuns), iguais: Number(l.iguais) };
}

export async function todosMunicipios() {
  "use cache";
  cacheLife("days");
  const lista: Pick<Municipio, "ibge_id" | "nome" | "uf">[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from("municipios").select("ibge_id, nome, uf").order("ibge_id").range(de, de + 999);
    if (error) throw new Error(error.message);
    lista.push(...data);
    if (data.length < 1000) return lista;
  }
}

export type ProposicaoAchada = { id: string; casa: string; tipo: string; numero: number; ano: number; ementa: string; fonte_url: string };

// Busca de proposições: "PL 1234/2023" vai direto; texto livre procura na ementa (as mais recentes primeiro)
export async function buscarProposicoes(q: string) {
  "use cache";
  cacheLife("hours");
  const sigla = /^\s*([A-Za-z]{2,4})\s*(\d+)\s*\/\s*(\d{4})\s*$/.exec(q);
  const colunas = "id, casa, tipo, numero, ano, ementa, fonte_url";
  // Palavras: sem acento, minúsculas, só letras/números (a função do banco usa o índice de trigramas)
  const termo = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!sigla && termo.length < 3) return [];
  const { data, error } = sigla
    ? await db.from("proposicoes").select(colunas).eq("tipo", sigla[1].toUpperCase()).eq("numero", Number(sigla[2])).eq("ano", Number(sigla[3])).order("apresentada_em", { ascending: false }).limit(20)
    : await db.rpc("buscar_proposicoes", { termo, limite: 20 }).select(colunas);
  if (error) throw new Error(error.message);
  return data as ProposicaoAchada[];
}

export type Artigo = { id: string; titulo: string; texto_oficial: string; texto_simples: string | null; por_que_importa: string | null; revisado_por: string | null; revisado_em: string | null };

// Só artigos revisados e publicados (a regra RLS e a restrição do banco garantem isso)
export async function artigosPublicados() {
  "use cache";
  cacheLife("hours");
  cacheTag("artigos");
  const { data, error } = await db.from("artigos").select("id, titulo, texto_oficial, texto_simples, por_que_importa, revisado_por, revisado_em").order("id");
  if (error) throw new Error(error.message);
  return data as Artigo[];
}

// ===== Pacto federativo =====
export type LinhaPacto = {
  uf: string;
  ano: number;
  arrecadacao: number;
  meses_arrecadacao: number;
  transferencias_estado: number;
  transferencias_municipios: number;
  meses_transferencias: number | null;
};

export async function pactoFederativo() {
  "use cache";
  cacheLife("days");
  cacheTag("federativo");
  const { data, error } = await db.from("pacto_federativo").select("*").gte("ano", 2019).order("ano", { ascending: false }).range(0, 999);
  if (error) throw new Error(error.message);
  return data.map((l) => ({
    ...l,
    arrecadacao: Number(l.arrecadacao),
    transferencias_estado: Number(l.transferencias_estado),
    transferencias_municipios: Number(l.transferencias_municipios),
  })) as LinhaPacto[];
}

export type GrupoTransferencia = { ano: number; destino: "estado" | "municipios"; grupo: string; federal: boolean; valor: number; meses: number };

export async function transferenciasDoEstado(uf: string) {
  "use cache";
  cacheLife("days");
  cacheTag("federativo");
  const { data, error } = await db.from("transferencias_grupos").select("ano, destino, grupo, federal, valor, meses").eq("uf", uf).order("ano", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((l) => ({ ...l, valor: Number(l.valor) })) as GrupoTransferencia[];
}

export async function transferenciasDoMunicipio(ibge: number) {
  "use cache";
  cacheLife("days");
  cacheTag("federativo");
  const { data, error } = await db.from("transferencias_municipios").select("ano, meses, fpm, federal, fonte_url").eq("municipio_id", ibge).order("ano", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((l) => ({ ano: l.ano as number, meses: l.meses as number, fpm: Number(l.fpm), federal: Number(l.federal), fonte_url: l.fonte_url as string }));
}
