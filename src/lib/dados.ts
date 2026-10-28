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
};

export async function listarParlamentares() {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares");
  const todos: Omit<Parlamentar, "nome_civil" | "fonte_url">[] = [];
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

export async function mandatos(id: string) {
  "use cache";
  cacheLife("days");
  const { data, error } = await db.from("mandatos").select("legislatura, uf, partido, inicio, fim").eq("parlamentar_id", id).order("legislatura", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Quantos votos de cada tipo o parlamentar tem registrados
export async function resumoVotos(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`parlamentar-${id}`);
  const tipos: Voto[] = ["sim", "nao", "abstencao", "obstrucao", "ausente", "outro"];
  const contagens = await Promise.all(
    tipos.map(async (voto) => {
      const { count, error } = await db.from("votos").select("votacao_id", { count: "exact", head: true }).eq("parlamentar_id", id).eq("voto", voto);
      if (error) throw new Error(error.message);
      return [voto, count ?? 0] as const;
    }),
  );
  const porTipo = Object.fromEntries(contagens) as Record<Voto, number>;
  const total = contagens.reduce((s, [, n]) => s + n, 0);
  const { count: proposicoes } = await db.from("autorias").select("proposicao_id", { count: "exact", head: true }).eq("parlamentar_id", id).eq("papel", "autor");
  return { porTipo, total, proposicoes: proposicoes ?? 0 };
}

export type LinhaVoto = {
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

export async function votosDoParlamentar(id: string, pagina: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(`parlamentar-${id}`);
  const de = (pagina - 1) * POR_PAGINA;
  const { data, count, error } = await db
    .from("votos_detalhados")
    .select("*", { count: "exact" })
    .eq("parlamentar_id", id)
    .order("data", { ascending: false })
    .order("votacao_id", { ascending: false })
    .range(de, de + POR_PAGINA - 1);
  // Página além do fim (ex.: link antigo com ?pagina=999): lista vazia em vez de erro.
  if (error?.code === "PGRST103") return { linhas: [] as LinhaVoto[], total: 0 };
  if (error) throw new Error(error.message);
  return { linhas: data as LinhaVoto[], total: count ?? 0 };
}

export type LinhaProposicao = {
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

export async function proposicoesDoParlamentar(id: string, pagina: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(`parlamentar-${id}`);
  const de = (pagina - 1) * POR_PAGINA;
  const { data, count, error } = await db
    .from("autorias_detalhadas")
    .select("*", { count: "exact" })
    .eq("parlamentar_id", id)
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

export async function presidenciasDoParlamentar(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("presidencias");
  const { data, error } = await db.from("presidencias").select("cargo, ano_inicio, ano_fim, inicio, fim").eq("parlamentar_id", id).order("ordem");
  if (error) throw new Error(error.message);
  return data as Pick<Presidencia, "cargo" | "ano_inicio" | "ano_fim" | "inicio" | "fim">[];
}
