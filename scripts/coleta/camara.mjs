// Robô da Câmara dos Deputados: deputados, proposições, autorias, votações, votos e orientações.
// Fontes: API v2 (lista de deputados) e arquivos anuais em lote (CSV) de dadosabertos.camara.leg.br.
import { baixarJson, db, gravar, idsExistentes, lerCsv } from "./comum.mjs";

const API = "https://dadosabertos.camara.leg.br/api/v2";
const ARQ = (nome, ano) => `https://dadosabertos.camara.leg.br/arquivos/${nome}/csv/${nome}-${ano}.csv`;
const PAGINA_VOTACAO = (id) => `${API}/votacoes/${id}`;
const PAGINA_PROPOSICAO = (id) => `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${id}`;

// Tipos de proposição que entram no perfil (requerimentos e emendas ficam de fora da V1).
// PDC é o nome antigo do PDL (até 2019).
const TIPOS = new Set(["PL", "PLP", "PEC", "PDL", "PDC", "PRC", "MPV", "PLV"]);

const LEGISLATURA = { numero: 57, inicio: "2023-02-01" };

// Anos antes da legislatura atual são "histórico": só entra o que envolve quem está no mandato hoje
// (votos deles, proposições de que são autores e as proposições votadas nessas votações).
export const historico = (ano) => ano < 2023;

const VOTO = { Sim: "sim", "Não": "nao", "Abstenção": "abstencao", "Obstrução": "obstrucao" };

// Proposição citada na descrição da votação: "Projeto de Lei nº 2.724, de 2015" ou "PL 2724/2015".
const CITACAO = [
  /(?:Projeto de Lei(?: Complementar| de Conversão)?|Proposta de Emenda à Constituição|Projeto de Decreto Legislativo|Projeto de Resolução|Medida Provisória)\s+n?[º°o.]*\s*([\d.]+)\s*(?:,\s*de\s*|\/)\s*(\d{4})/i,
  /\b(?:PLP|PLV|PEC|PDL|PDC|PRC|MPV|PL)\s*(?:n?[º°o.]*\s*)?([\d.]+)\/(\d{4})/,
];

export function citadaNaDescricao(descricao) {
  for (const r of CITACAO) {
    const m = (descricao ?? "").match(r);
    if (m) return { numero: Number(m[1].replace(/\./g, "")), ano: Number(m[2]) };
  }
  return null;
}

// Escolhe a proposição principal da votação entre as que a fonte associa a ela.
// Se a descrição cita uma proposição, só ela serve: sem vínculo é melhor que vínculo errado.
export function escolherPrincipal(descricao, citadas, existentes) {
  const alvo = citadaNaDescricao(descricao);
  if (alvo) {
    return citadas.find((c) => existentes.get(c)?.numero === alvo.numero && existentes.get(c)?.ano === alvo.ano) ?? null;
  }
  return citadas.find((c) => existentes.has(c)) ?? null;
}

async function mapaProposicoes() {
  const mapa = new Map();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from("proposicoes").select("id, numero, ano").eq("casa", "camara").order("id").range(de, de + 999);
    if (error) throw new Error(`proposicoes: ${error.message}`);
    data.forEach((l) => mapa.set(l.id, { numero: l.numero, ano: l.ano }));
    if (data.length < 1000) return mapa;
  }
}

async function votacoesGravadas() {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from("votacoes").select("id, descricao, proposicao_id, proposicoes_citadas").eq("casa", "camara").order("id").range(de, de + 999);
    if (error) throw new Error(`votacoes: ${error.message}`);
    todas.push(...data);
    if (data.length < 1000) return todas;
  }
}

// Refaz o vínculo votação → proposição principal depois que proposições antigas entram no banco.
export async function vincular() {
  const existentes = await mapaProposicoes();
  const mudar = [];
  for (const v of await votacoesGravadas()) {
    const p = escolherPrincipal(v.descricao, v.proposicoes_citadas ?? [], existentes);
    if (p !== v.proposicao_id) mudar.push({ id: v.id, proposicao_id: p });
  }
  for (let i = 0; i < mudar.length; i += 20) {
    await Promise.all(
      mudar.slice(i, i + 20).map(async (m) => {
        const { error } = await db.from("votacoes").update({ proposicao_id: m.proposicao_id }).eq("id", m.id);
        if (error) throw new Error(`votacoes: ${error.message}`);
      }),
    );
  }
  return mudar.length;
}

async function paginas(endereco) {
  const dados = [];
  let proxima = endereco;
  while (proxima) {
    const r = await baixarJson(proxima);
    if (!r) break;
    dados.push(...r.dados);
    proxima = r.links?.find((l) => l.rel === "next")?.href ?? null;
  }
  return dados;
}

export async function deputados() {
  const daLegislatura = await paginas(`${API}/deputados?idLegislatura=${LEGISLATURA.numero}&itens=100&ordem=ASC&ordenarPor=nome`);
  const emExercicio = new Set((await paginas(`${API}/deputados?itens=100`)).map((d) => d.id));

  // Nome civil vem do arquivo geral; o CPF que ele também traz nunca é lido.
  const nomeCivil = new Map();
  for await (const l of lerCsv("https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv", ["uri", "nomeCivil"])) {
    nomeCivil.set(Number(l.uri.split("/").pop()), l.nomeCivil);
  }

  const parlamentares = daLegislatura.map((d) => ({
    id: `C-${d.id}`,
    casa: "camara",
    id_fonte: String(d.id),
    nome_parlamentar: d.nome,
    nome_civil: nomeCivil.get(d.id) || d.nome,
    uf: d.siglaUf,
    partido_atual: d.siglaPartido,
    foto_url: d.urlFoto,
    ativo: emExercicio.has(d.id),
    fonte_url: `${API}/deputados/${d.id}`,
  }));
  const mandatos = daLegislatura.map((d) => ({
    parlamentar_id: `C-${d.id}`,
    casa: "camara",
    legislatura: LEGISLATURA.numero,
    uf: d.siglaUf,
    partido: d.siglaPartido,
    inicio: LEGISLATURA.inicio,
    fim: null,
    fonte_url: `${API}/deputados/${d.id}`,
  }));
  let n = await gravar("parlamentares", parlamentares, (l) => l.id, "id");
  n += await gravar("mandatos", mandatos, (l) => `${l.parlamentar_id}|${l.legislatura}`, "parlamentar_id,legislatura");
  return n;
}

export async function proposicoes(ano) {
  const deputadosOk = await idsExistentes("parlamentares", "camara");

  // No histórico, só as proposições de autoria de quem está no mandato hoje ou que foram a voto nominal.
  let interessa = null;
  if (historico(ano)) {
    interessa = new Set();
    for await (const l of lerCsv(ARQ("proposicoesAutores", ano), ["idProposicao", "idDeputadoAutor"])) {
      if (l.idDeputadoAutor && deputadosOk.has(`C-${l.idDeputadoAutor}`)) interessa.add(`C-${l.idProposicao}`);
    }
    for await (const l of lerCsv(ARQ("votacoesProposicoes", ano), ["proposicao_id"])) interessa.add(`C-${l.proposicao_id}`);
    // Proposições deste ano que foram a voto em anos posteriores já carregados
    for (const v of await votacoesGravadas()) for (const c of v.proposicoes_citadas ?? []) interessa.add(c);
  }

  const linhas = [];
  for await (const l of lerCsv(ARQ("proposicoes", ano), ["id", "siglaTipo", "numero", "ano", "ementa", "dataApresentacao", "ultimoStatus_descricaoSituacao"])) {
    if (!TIPOS.has(l.siglaTipo) || !l.ementa) continue;
    if (interessa && !interessa.has(`C-${l.id}`)) continue;
    linhas.push({
      id: `C-${l.id}`,
      casa: "camara",
      tipo: l.siglaTipo,
      numero: Number(l.numero),
      ano: Number(l.ano),
      ementa: l.ementa,
      situacao: l.ultimoStatus_descricaoSituacao || "",
      apresentada_em: l.dataApresentacao.slice(0, 10),
      fonte_url: PAGINA_PROPOSICAO(l.id),
    });
  }
  let n = await gravar("proposicoes", linhas, (l) => l.id, "id");

  const proposicoesOk = new Set(linhas.map((l) => l.id));
  const autorias = [];
  for await (const l of lerCsv(ARQ("proposicoesAutores", ano), ["idProposicao", "idDeputadoAutor", "ordemAssinatura"])) {
    const p = `C-${l.idProposicao}`;
    const d = `C-${l.idDeputadoAutor}`;
    if (!l.idDeputadoAutor || !proposicoesOk.has(p) || !deputadosOk.has(d)) continue;
    autorias.push({ proposicao_id: p, parlamentar_id: d, papel: l.ordemAssinatura === "1" ? "autor" : "coautor", fonte_url: PAGINA_PROPOSICAO(l.idProposicao) });
  }
  n += await gravar("autorias", autorias, (l) => `${l.proposicao_id}|${l.parlamentar_id}`, "proposicao_id,parlamentar_id");
  return n;
}

export async function votacoes(ano) {
  // 1) Quais votações são nominais (têm voto individual) e quais votos gravar
  const deputadosOk = await idsExistentes("parlamentares", "camara");
  const votos = [];
  const nominais = new Set();
  for await (const l of lerCsv(ARQ("votacoesVotos", ano), ["idVotacao", "voto", "deputado_id"])) {
    const d = `C-${l.deputado_id}`;
    if (!deputadosOk.has(d)) continue;
    nominais.add(l.idVotacao);
    // Voto em branco na fonte não é voto: fica sem registro (o placar oficial vem do arquivo de votações).
    if (!l.voto.trim()) continue;
    votos.push({
      votacao_id: `C-${l.idVotacao}`,
      parlamentar_id: d,
      voto: VOTO[l.voto] ?? "outro",
      voto_original: l.voto,
    });
  }

  // 2) Proposições que a fonte associa a cada votação (a principal é escolhida no passo 3)
  const existentes = await mapaProposicoes();
  const citadasDa = new Map();
  for await (const l of lerCsv(ARQ("votacoesProposicoes", ano), ["idVotacao", "proposicao_id"])) {
    if (!nominais.has(l.idVotacao) || !l.proposicao_id) continue;
    const lista = citadasDa.get(l.idVotacao) ?? [];
    const p = `C-${l.proposicao_id}`;
    if (!lista.includes(p)) lista.push(p);
    citadasDa.set(l.idVotacao, lista);
  }

  // 3) As votações nominais
  const lista = [];
  for await (const l of lerCsv(ARQ("votacoes", ano), ["id", "data", "dataHoraRegistro", "aprovacao", "descricao", "votosSim", "votosNao", "votosOutros"])) {
    if (!nominais.has(l.id)) continue;
    const descricao = l.descricao || "Votação nominal";
    const citadas = citadasDa.get(l.id) ?? [];
    lista.push({
      id: `C-${l.id}`,
      casa: "camara",
      data: l.dataHoraRegistro || l.data,
      descricao,
      resultado: l.aprovacao === "1" ? "aprovada" : l.aprovacao === "0" ? "rejeitada" : "",
      proposicao_id: escolherPrincipal(descricao, citadas, existentes),
      proposicoes_citadas: citadas,
      placar_sim: l.votosSim === "" ? null : Number(l.votosSim),
      placar_nao: l.votosNao === "" ? null : Number(l.votosNao),
      placar_outros: l.votosOutros === "" ? null : Number(l.votosOutros),
      fonte_url: PAGINA_VOTACAO(l.id),
    });
  }
  let n = await gravar("votacoes", lista, (l) => l.id, "id");
  const votacoesOk = new Set(lista.map((l) => l.id));
  n += await gravar("votos", votos.filter((v) => votacoesOk.has(v.votacao_id)), (l) => `${l.votacao_id}|${l.parlamentar_id}`, "votacao_id,parlamentar_id");

  // 4) Orientações dos partidos
  const orientacoes = [];
  for await (const l of lerCsv(ARQ("votacoesOrientacoes", ano), ["idVotacao", "siglaBancada", "orientacao"])) {
    if (!votacoesOk.has(`C-${l.idVotacao}`) || !l.orientacao || !l.siglaBancada) continue;
    orientacoes.push({ votacao_id: `C-${l.idVotacao}`, partido: l.siglaBancada, orientacao: l.orientacao, fonte_url: PAGINA_VOTACAO(l.idVotacao) });
  }
  n += await gravar("orientacoes", orientacoes, (l) => `${l.votacao_id}|${l.partido}`, "votacao_id,partido");
  return n;
}

// Carreira: em quais legislaturas anteriores cada deputado atual também teve mandato na Câmara.
// O partido de cada mandato antigo fica em branco até ser conferido; a UF vem da lista oficial da legislatura.
export async function legislaturas() {
  const r = await paginas(`${API}/legislaturas?itens=100`);
  return new Map(r.map((l) => [Number(l.id), { inicio: l.dataInicio, fim: l.dataFim }]));
}

export async function carreira(ufsValidas, datas) {
  const atuais = await idsExistentes("parlamentares", "camara");
  const mandatos = [];
  for (const [numero, d] of datas) {
    if (numero >= LEGISLATURA.numero) continue;
    for (const dep of await paginas(`${API}/deputados?idLegislatura=${numero}&itens=100`)) {
      const id = `C-${dep.id}`;
      if (!atuais.has(id) || !ufsValidas.has(dep.siglaUf)) continue;
      mandatos.push({ parlamentar_id: id, casa: "camara", legislatura: numero, uf: dep.siglaUf, partido: "", inicio: d.inicio, fim: d.fim, fonte_url: `${API}/deputados/${dep.id}` });
    }
  }
  return gravar("mandatos", mandatos, (l) => `${l.parlamentar_id}|${l.legislatura}`, "parlamentar_id,legislatura");
}

// Partido em cada mandato anterior: histórico oficial do deputado (/deputados/{id}/historico).
// Se mudou de partido dentro da legislatura, guarda a sequência ("PT → PSB").
export async function partidos() {
  const { data, error } = await db.from("mandatos").select("parlamentar_id, legislatura").eq("casa", "camara").eq("partido", "").range(0, 19999);
  if (error) throw new Error(`mandatos: ${error.message}`);
  const porPessoa = new Map();
  for (const m of data) porPessoa.set(m.parlamentar_id, [...(porPessoa.get(m.parlamentar_id) ?? []), m.legislatura]);
  let n = 0;
  const pessoas = [...porPessoa];
  for (let i = 0; i < pessoas.length; i += 5) {
    await Promise.all(
      pessoas.slice(i, i + 5).map(async ([pid, legs]) => {
        const r = await baixarJson(`${API}/deputados/${pid.slice(2)}/historico`);
        const hist = (r?.dados ?? []).slice().sort((a, b) => String(a.dataHora).localeCompare(String(b.dataHora)));
        for (const leg of legs) {
          const seq = [];
          for (const h of hist) if (Number(h.idLegislatura) === leg && h.siglaPartido && seq.at(-1) !== h.siglaPartido) seq.push(h.siglaPartido);
          if (!seq.length) continue;
          const { error: e } = await db.from("mandatos").update({ partido: seq.join(" → ") }).eq("parlamentar_id", pid).eq("legislatura", leg);
          if (e) throw new Error(`mandatos: ${e.message}`);
          n++;
        }
      }),
    );
  }
  console.log(`  ${n} de ${data.length} mandato(s) antigo(s) da Câmara com partido`);
  return n;
}
