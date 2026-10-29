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
      // Matérias antigas às vezes trazem número ou ano fora do formato numérico: ficam sem vínculo.
      const numeroOk = Number.isFinite(Number(v.numero)) && Number(v.numero) > 0;
      const anoOk = Number.isFinite(Number(v.ano)) && Number(v.ano) > 1800;
      if (v.codigoMateria && v.sigla && numeroOk && anoOk) {
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

// Autoria de projetos: serviço novo /processo (o antigo /senador/{codigo}/autorias foi desativado em 2026).
// Só projetos com efeito de lei (requerimentos, licenças, votos de pesar etc. ficam de fora, como na Câmara).
const DOCUMENTOS = new Set([
  "Projeto de Lei Ordinária",
  "Projeto de Lei Complementar",
  "Proposta de Emenda à Constituição",
  "Projeto de Decreto Legislativo",
  "Projeto de Resolução",
]);

// Quem aparece primeiro no campo "autoria" é o autor principal; os demais, coautores.
function papel(autoria, nome) {
  const texto = (autoria ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const alvo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // "Senador(a) Fulano" ou, em projeto da época de deputado, "Deputado(a) Federal Fulano"
  const PREFIXO = /^(senador|senadora|deputado|deputada)(\s+federal)?\s+/;
  return PREFIXO.test(texto) && texto.replace(PREFIXO, "").startsWith(alvo) ? "autor" : "coautor";
}

export async function autorias({ desde = null } = {}) {
  const { data: senadores, error } = await db.from("parlamentares").select("id, id_fonte, nome_parlamentar").eq("casa", "senado");
  if (error) throw new Error(`parlamentares: ${error.message}`);

  const proposicoes = new Map();
  const autoriasLista = [];
  for (const s of senadores) {
    const filtro = desde ? `&dataInicioApresentacao=${desde}` : "";
    const lista_ = (await baixarJson(`${S}/processo?codigoParlamentarAutor=${s.id_fonte}${filtro}`)) ?? [];
    for (const p of lista_) {
      if (!DOCUMENTOS.has(p.tipoDocumento) || !p.codigoMateria) continue;
      // Projeto vindo da Câmara (autoria "Câmara dos Deputados"): a fonte não diz quem o escreveu; fica de fora.
      if (/^c[âa]mara dos deputados/i.test(p.autoria ?? "")) continue;
      const m = /^([A-Z]+)\s+(\d+)\/(\d{4})/.exec(p.identificacao ?? "");
      if (!m) continue;
      const id = `S-${p.codigoMateria}`;
      proposicoes.set(id, {
        id,
        casa: "senado",
        tipo: m[1],
        numero: Number(m[2]),
        ano: Number(m[3]),
        ementa: (p.ementa || p.identificacao).replace(/\s+/g, " ").trim(),
        situacao: [p.situacaoAtual, p.normaGerada].filter(Boolean).join(" · "),
        apresentada_em: p.dataApresentacao || `${m[3]}-01-01`,
        fonte_url: MATERIA(p.codigoMateria),
      });
      autoriasLista.push({ proposicao_id: id, parlamentar_id: s.id, papel: papel(p.autoria, s.nome_parlamentar), fonte_url: MATERIA(p.codigoMateria) });
    }
  }
  // Proposições: atualiza ementa e situação sem tocar no resumo automático
  let n = await gravar("proposicoes", [...proposicoes.values()], (l) => l.id, "id");
  n += await gravar("autorias", autoriasLista, (l) => `${l.proposicao_id}|${l.parlamentar_id}`, "proposicao_id,parlamentar_id");

  // Carga completa: o que a fonte oficial não lista mais para o senador sai do banco
  if (!desde) {
    const atuais = new Set(autoriasLista.map((a) => `${a.proposicao_id}|${a.parlamentar_id}`));
    for (const s of senadores) {
      const { data: gravadas, error: e1 } = await db.from("autorias").select("proposicao_id").eq("parlamentar_id", s.id);
      if (e1) throw new Error(`autorias: ${e1.message}`);
      const sobrando = gravadas.map((g) => g.proposicao_id).filter((p) => !atuais.has(`${p}|${s.id}`));
      if (sobrando.length) {
        const { error: e2 } = await db.from("autorias").delete().eq("parlamentar_id", s.id).in("proposicao_id", sobrando);
        if (e2) throw new Error(`autorias: ${e2.message}`);
        console.log(`  ${s.nome_parlamentar}: ${sobrando.length} autoria(s) fora da lista oficial removida(s)`);
      }
    }
  }
  return n;
}

// Partido em cada mandato anterior: filiações oficiais do senador (/senador/{codigo}/filiacoes).
// Entram os partidos com filiação vigente em algum momento da legislatura, em ordem ("PMDB → MDB").
export async function partidos() {
  const { data, error } = await db.from("mandatos").select("parlamentar_id, legislatura, inicio, fim").eq("casa", "senado").eq("partido", "").range(0, 19999);
  if (error) throw new Error(`mandatos: ${error.message}`);
  const porPessoa = new Map();
  for (const m of data) porPessoa.set(m.parlamentar_id, [...(porPessoa.get(m.parlamentar_id) ?? []), m]);
  let n = 0;
  const pessoas = [...porPessoa];
  for (let i = 0; i < pessoas.length; i += 5) {
    await Promise.all(
      pessoas.slice(i, i + 5).map(async ([pid, mands]) => {
        const r = await baixarJson(`${S}/senador/${pid.slice(2)}/filiacoes.json`);
        const fil = lista(r?.FiliacaoParlamentar?.Parlamentar?.Filiacoes?.Filiacao)
          .map((f) => ({ sigla: f.Partido?.SiglaPartido, de: (f.DataFiliacao ?? "").slice(0, 10), ate: (f.DataDesfiliacao ?? "9999-12-31").slice(0, 10) }))
          .filter((f) => f.sigla && f.de)
          .sort((a, b) => a.de.localeCompare(b.de));
        for (const m of mands) {
          const seq = [];
          const fim = m.fim ?? "9999-12-31";
          const inicio = m.inicio ?? "0000-01-01";
          for (const f of fil) if (f.de <= fim && f.ate >= inicio && seq.at(-1) !== f.sigla) seq.push(f.sigla);
          if (!seq.length) continue;
          const { error: e } = await db.from("mandatos").update({ partido: seq.join(" → ") }).eq("parlamentar_id", pid).eq("legislatura", m.legislatura);
          if (e) throw new Error(`mandatos: ${e.message}`);
          n++;
        }
      }),
    );
  }
  console.log(`  ${n} de ${data.length} mandato(s) antigo(s) do Senado com partido`);
  return n;
}
