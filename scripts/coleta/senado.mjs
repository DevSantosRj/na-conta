// Robô do Senado Federal: senadores, votações nominais de Plenário e votos.
// Fonte: dados abertos do Senado (legis.senado.leg.br/dadosabertos), serviço /votacao.
import { baixarJson, db, gravar, idsExistentes } from "./comum.mjs";

const historico = (ano) => ano < 2023;

const S = "https://legis.senado.leg.br/dadosabertos";
const LEGISLATURA = { numero: 57, inicio: "2023-02-01" };
const FOTO = (c) => `https://www.senado.leg.br/senadores/img/fotos-oficiais/senador${c}.jpg`;
const PERFIL = (c) => `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${c}`;
const MATERIA = (c) => `https://www25.senado.leg.br/web/atividade/materias/-/materia/${c}`;

const lista = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// Sim/Não/Abstenção viram o voto; ausências justificadas (licença, missão, atividade parlamentar)
// viram "outro" e guardam o texto original; só "Não compareceu" vira "ausente".
function traduzVoto(sigla) {
  const s = (sigla ?? "").trim();
  if (s === "Sim") return "sim";
  if (s === "Não") return "nao";
  if (s.startsWith("Abst")) return "abstencao";
  if (s.startsWith("Obstr")) return "obstrucao";
  if (s === "NCom") return "ausente";
  return "outro";
}

export async function senadores() {
  const atual = await baixarJson(`${S}/senador/lista/atual.json`);
  const emExercicio = new Map(
    lista(atual?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar).map((p) => [p.IdentificacaoParlamentar.CodigoParlamentar, p]),
  );
  const leg = await baixarJson(`${S}/senador/lista/legislatura/${LEGISLATURA.numero}.json`);
  const daLegislatura = lista(leg?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar);

  const parlamentares = [];
  const mandatos = [];
  for (const p of daLegislatura) {
    const id = p.IdentificacaoParlamentar;
    const codigo = id.CodigoParlamentar;
    const mandato = lista(p.Mandatos?.Mandato).find((m) =>
      [m.PrimeiraLegislaturaDoMandato?.NumeroLegislatura, m.SegundaLegislaturaDoMandato?.NumeroLegislatura].includes(String(LEGISLATURA.numero)),
    );
    const uf = mandato?.UfParlamentar;
    if (!uf) continue;
    const exercicio = emExercicio.get(codigo);
    const partido = exercicio?.IdentificacaoParlamentar?.SiglaPartidoParlamentar ?? id.SiglaPartidoParlamentar ?? null;
    parlamentares.push({
      id: `S-${codigo}`,
      casa: "senado",
      id_fonte: codigo,
      nome_parlamentar: id.NomeParlamentar,
      nome_civil: id.NomeCompletoParlamentar || id.NomeParlamentar,
      uf,
      partido_atual: partido,
      foto_url: FOTO(codigo),
      ativo: emExercicio.has(codigo),
      fonte_url: PERFIL(codigo),
    });
    mandatos.push({
      parlamentar_id: `S-${codigo}`,
      casa: "senado",
      legislatura: LEGISLATURA.numero,
      uf,
      partido: partido ?? "",
      inicio: LEGISLATURA.inicio,
      fim: null,
      fonte_url: PERFIL(codigo),
    });
  }
  let n = await gravar("parlamentares", parlamentares, (l) => l.id, "id");
  n += await gravar("mandatos", mandatos, (l) => `${l.parlamentar_id}|${l.legislatura}`, "parlamentar_id,legislatura");
  return n;
}

function meses(ano) {
  const fim = new Date();
  const out = [];
  for (let m = 1; m <= 12; m++) {
    const ini = new Date(Date.UTC(ano, m - 1, 1));
    if (ini > fim) break;
    const ult = new Date(Date.UTC(ano, m, 0));
    out.push([ini.toISOString().slice(0, 10), ult.toISOString().slice(0, 10)]);
  }
  return out;
}

export async function votacoes(ano) {
  const parlamentares = [];
  const proposicoes = [];
  const lista_ = [];
  const votos = [];

  for (const [ini, fim] of meses(ano)) {
    const dados = (await baixarJson(`${S}/votacao?dataInicio=${ini}&dataFim=${fim}`)) ?? [];
    for (const v of dados) {
      if (v.votacaoSecreta === "S" || !Array.isArray(v.votos) || !v.votos.length) continue;
      const id = `S-${v.codigoSessaoVotacao}`;
      let proposicaoId = null;
      if (v.codigoMateria && v.sigla && v.numero && v.ano) {
        proposicaoId = `S-${v.codigoMateria}`;
        proposicoes.push({
          id: proposicaoId,
          casa: "senado",
          tipo: v.sigla,
          numero: Number(v.numero),
          ano: Number(v.ano),
          ementa: v.ementa || v.identificacao,
          situacao: "",
          apresentada_em: v.dataApresentacao || `${v.ano}-01-01`,
          fonte_url: MATERIA(v.codigoMateria),
        });
      }
      lista_.push({
        id,
        casa: "senado",
        data: v.dataSessao,
        descricao: v.descricaoVotacao || v.identificacao || "Votação nominal",
        resultado: v.resultadoVotacao === "A" ? "aprovada" : v.resultadoVotacao === "R" ? "rejeitada" : "",
        proposicao_id: proposicaoId,
        fonte_url: v.codigoMateria ? MATERIA(v.codigoMateria) : `${S}/votacao?dataInicio=${v.dataSessao}&dataFim=${v.dataSessao}`,
      });
      for (const p of v.votos) {
        const pid = `S-${p.codigoParlamentar}`;
        // Quem votou e ainda não está no banco (ex.: suplente em exercício) entra com os dados do próprio voto.
        parlamentares.push({
          id: pid,
          casa: "senado",
          id_fonte: String(p.codigoParlamentar),
          nome_parlamentar: p.nomeParlamentar,
          nome_civil: p.nomeParlamentar,
          uf: p.siglaUFParlamentar,
          partido_atual: p.siglaPartidoParlamentar,
          foto_url: FOTO(p.codigoParlamentar),
          ativo: false,
          fonte_url: PERFIL(p.codigoParlamentar),
        });
        votos.push({
          votacao_id: id,
          parlamentar_id: pid,
          voto: traduzVoto(p.siglaVotoParlamentar),
          voto_original: [p.siglaVotoParlamentar, p.descricaoVotoParlamentar].filter(Boolean).join(" – "),
        });
      }
    }
  }

  // No histórico, só entram os votos de quem está no mandato hoje (e as votações e matérias em que votaram).
  if (historico(ano)) {
    const atuais = await idsExistentes("parlamentares", "senado");
    const mantidos = votos.filter((v) => atuais.has(v.parlamentar_id));
    const comVoto = new Set(mantidos.map((v) => v.votacao_id));
    const listaH = lista_.filter((v) => comVoto.has(v.id));
    const materias = new Set(listaH.map((v) => v.proposicao_id).filter(Boolean));
    const propsH = new Map(proposicoes.filter((p) => materias.has(p.id)).map((p) => [p.id, p]));
    for (let i = 0, ids = [...propsH.keys()]; i < ids.length; i += 500) {
      const { data, error } = await db.from("proposicoes").select("id").in("id", ids.slice(i, i + 500));
      if (error) throw new Error(`proposicoes: ${error.message}`);
      data.forEach((l) => propsH.delete(l.id));
    }
    let h = await gravar("proposicoes", [...propsH.values()], (l) => l.id, "id");
    h += await gravar("votacoes", listaH, (l) => l.id, "id");
    h += await gravar("votos", mantidos, (l) => `${l.votacao_id}|${l.parlamentar_id}`, "votacao_id,parlamentar_id");
    return h;
  }

  // Parlamentares novos só são inseridos; os já cadastrados (com nome civil e "ativo" corretos) não são sobrescritos.
  const novos = new Map(parlamentares.map((p) => [p.id, p]));
  for (let i = 0, ids = [...novos.keys()]; i < ids.length; i += 500) {
    const { data, error } = await db.from("parlamentares").select("id").in("id", ids.slice(i, i + 500));
    if (error) throw new Error(`parlamentares: ${error.message}`);
    data.forEach((l) => novos.delete(l.id));
  }
  let n = await gravar("parlamentares", [...novos.values()], (l) => l.id, "id");
  // Proposições do Senado: insere as novas sem apagar resumo ou situação já gravados.
  const props = new Map(proposicoes.map((p) => [p.id, p]));
  for (let i = 0, ids = [...props.keys()]; i < ids.length; i += 500) {
    const { data, error } = await db.from("proposicoes").select("id").in("id", ids.slice(i, i + 500));
    if (error) throw new Error(`proposicoes: ${error.message}`);
    data.forEach((l) => props.delete(l.id));
  }
  n += await gravar("proposicoes", [...props.values()], (l) => l.id, "id");
  n += await gravar("votacoes", lista_, (l) => l.id, "id");
  n += await gravar("votos", votos, (l) => `${l.votacao_id}|${l.parlamentar_id}`, "votacao_id,parlamentar_id");
  return n;
}

// Carreira: em quais legislaturas anteriores cada senador atual também teve mandato no Senado.
export async function carreira(ufsValidas, datas) {
  const atuais = await idsExistentes("parlamentares", "senado");
  const mandatos = [];
  for (const [numero, d] of datas) {
    if (numero >= LEGISLATURA.numero) continue;
    const leg = await baixarJson(`${S}/senador/lista/legislatura/${numero}.json`);
    for (const p of lista(leg?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar)) {
      const codigo = p.IdentificacaoParlamentar?.CodigoParlamentar;
      if (!atuais.has(`S-${codigo}`)) continue;
      const m = lista(p.Mandatos?.Mandato).find((x) =>
        [x.PrimeiraLegislaturaDoMandato?.NumeroLegislatura, x.SegundaLegislaturaDoMandato?.NumeroLegislatura].includes(String(numero)),
      );
      const uf = m?.UfParlamentar;
      if (!ufsValidas.has(uf)) continue;
      mandatos.push({ parlamentar_id: `S-${codigo}`, casa: "senado", legislatura: numero, uf, partido: "", inicio: d.inicio, fim: d.fim, fonte_url: PERFIL(codigo) });
    }
  }
  return gravar("mandatos", mandatos, (l) => `${l.parlamentar_id}|${l.legislatura}`, "parlamentar_id,legislatura");
}
