// Liga a ficha da Câmara e a do Senado da mesma pessoa (carreira única no perfil).
// Critério: nome civil completo E data de nascimento iguais nas duas fontes oficiais. Nome parecido não basta.
// Do deputados.csv só são lidas as colunas uri, nome, nomeCivil e dataNascimento (o CPF nunca é lido).
import { baixarJson, db, gravar, lerCsv } from "./comum.mjs";

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const lista = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const chave = (nome, nasc) => (nome && nasc ? `${norm(nome)}|${nasc.slice(0, 10)}` : null);

async function emLotes(itens, n, fn) {
  const out = [];
  for (let i = 0; i < itens.length; i += n) out.push(...(await Promise.all(itens.slice(i, i + n).map(fn))));
  return out;
}

async function fichaSenador(codigo) {
  const d = await baixarJson(`${SENADO}/senador/${codigo}.json`);
  const p = d?.DetalheParlamentar?.Parlamentar;
  if (!p) return null;
  return {
    codigo: String(codigo),
    nome: p.IdentificacaoParlamentar?.NomeParlamentar,
    nomeCivil: p.IdentificacaoParlamentar?.NomeCompletoParlamentar,
    nascimento: p.DadosBasicosParlamentar?.DataNascimento ?? null,
    uf: p.IdentificacaoParlamentar?.UfParlamentar,
    partido: p.IdentificacaoParlamentar?.SiglaPartidoParlamentar ?? null,
  };
}

export async function ligar() {
  const { data: todos, error } = await db.from("parlamentares").select("id, casa, id_fonte, nome_civil, outra_casa_id");
  if (error) throw new Error(`parlamentares: ${error.message}`);
  const existe = new Set(todos.map((p) => p.id));

  // 1) Todos os deputados que já passaram pela Câmara (arquivo oficial único)
  const deputados = [];
  for await (const l of lerCsv("https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv", ["uri", "nome", "nomeCivil", "dataNascimento"])) {
    deputados.push({ id: Number(l.uri.split("/").pop()), nome: l.nome, nomeCivil: l.nomeCivil, nascimento: l.dataNascimento || null });
  }
  const deputadoPorChave = new Map();
  const repetidas = new Set();
  for (const d of deputados) {
    const k = chave(d.nomeCivil, d.nascimento);
    if (!k) continue;
    if (deputadoPorChave.has(k)) repetidas.add(k);
    deputadoPorChave.set(k, d);
  }
  const nascDeputado = new Map(deputados.map((d) => [`C-${d.id}`, d.nascimento]));

  // 2) Ficha (com data de nascimento) de cada senador do banco
  const senadores = todos.filter((p) => p.casa === "senado");
  const fichas = (await emLotes(senadores, 5, (s) => fichaSenador(s.id_fonte))).filter(Boolean);
  const pares = new Map(); // S-x -> C-y

  for (const f of fichas) {
    const k = chave(f.nomeCivil, f.nascimento);
    if (k && deputadoPorChave.has(k) && !repetidas.has(k)) pares.set(`S-${f.codigo}`, `C-${deputadoPorChave.get(k).id}`);
  }

  // 3) Deputados atuais que já foram senadores: candidatos pelas listas de legislaturas anteriores do Senado
  const deputadosNoBanco = todos.filter((p) => p.casa === "camara");
  const porNomeCivil = new Map(deputadosNoBanco.map((p) => [norm(p.nome_civil), p.id]));
  const candidatos = new Map();
  for (let leg = 47; leg <= 57; leg++) {
    const l = await baixarJson(`${SENADO}/senador/lista/legislatura/${leg}.json`);
    for (const p of lista(l?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar)) {
      const id = p.IdentificacaoParlamentar;
      const dep = porNomeCivil.get(norm(id?.NomeCompletoParlamentar));
      if (dep && ![...pares.values()].includes(dep)) candidatos.set(String(id.CodigoParlamentar), dep);
    }
  }
  for (const [codigo, dep] of candidatos) {
    const f = await fichaSenador(codigo);
    if (f && f.nascimento && f.nascimento.slice(0, 10) === (nascDeputado.get(dep) ?? "").slice(0, 10)) {
      pares.set(`S-${codigo}`, dep);
      fichas.push(f);
    }
  }

  // 4) Cria a ficha que faltar (ex-deputado hoje senador, ou ex-senador hoje deputado), sem marcar como em exercício
  const novas = [];
  for (const [s, c] of pares) {
    if (!existe.has(c)) {
      const d = (await baixarJson(`${CAMARA}/deputados/${c.slice(2)}`))?.dados;
      if (!d) continue;
      novas.push({
        id: c,
        casa: "camara",
        id_fonte: c.slice(2),
        nome_parlamentar: d.ultimoStatus?.nome ?? d.nomeCivil,
        nome_civil: d.nomeCivil,
        uf: d.ultimoStatus?.siglaUf ?? d.ufNascimento,
        partido_atual: d.ultimoStatus?.siglaPartido ?? null,
        foto_url: d.ultimoStatus?.urlFoto ?? null,
        ativo: false,
        fonte_url: `${CAMARA}/deputados/${c.slice(2)}`,
      });
    }
    if (!existe.has(s)) {
      const f = fichas.find((x) => `S-${x.codigo}` === s);
      if (!f) continue;
      novas.push({
        id: s,
        casa: "senado",
        id_fonte: f.codigo,
        nome_parlamentar: f.nome,
        nome_civil: f.nomeCivil,
        uf: f.uf,
        partido_atual: f.partido,
        foto_url: `https://www.senado.leg.br/senadores/img/fotos-oficiais/senador${f.codigo}.jpg`,
        ativo: false,
        fonte_url: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${f.codigo}`,
      });
    }
  }
  const validas = novas.filter((n) => n.uf);
  let total = await gravar("parlamentares", validas, (l) => l.id, "id");
  validas.forEach((n) => existe.add(n.id));

  // 5) Liga as duas fichas (nos dois sentidos) e guarda a data de nascimento usada na conferência
  for (const [s, c] of pares) {
    if (!existe.has(s) || !existe.has(c)) continue;
    const nasc = fichas.find((x) => `S-${x.codigo}` === s)?.nascimento ?? null;
    for (const [de, para] of [
      [s, c],
      [c, s],
    ]) {
      const { error: e } = await db.from("parlamentares").update({ outra_casa_id: para, data_nascimento: nasc }).eq("id", de);
      if (e) throw new Error(`parlamentares: ${e.message}`);
    }
    total++;
    console.log(`  ligado: ${s} ↔ ${c}`);
  }
  console.log(`  ${pares.size} pessoa(s) com carreira nas duas Casas · ${validas.length} ficha(s) nova(s) · ${repetidas.size} chave(s) ambígua(s) ignorada(s)`);
  return total;
}
