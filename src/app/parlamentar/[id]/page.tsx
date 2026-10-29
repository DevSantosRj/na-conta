import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ResumoEmendas } from "@/components/ResumoEmendas";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import {
  buscarParlamentar,
  emendasDoParlamentar,
  gastosDoParlamentar,
  nomesDeMunicipios,
  mandatos,
  POR_PAGINA,
  presidenciasDoParlamentar,
  proposicoesDoParlamentar,
  resumoVotos,
  votosDoParlamentar,
} from "@/lib/dados";
import { CASA, categoriaLegivel, data, numero, reais, rotuloVoto, siglaProposicao, VOTO } from "@/lib/formato";
import { ESTADOS } from "@/dados/estados";
import { Seguir } from "./Seguir";
import styles from "./parlamentar.module.css";

type Props = PageProps<"/parlamentar/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await buscarParlamentar(id);
  if (!p) return { title: "Parlamentar não encontrado" };
  const cargo = CASA[p.casa].cargo;
  return {
    title: `${p.nome_parlamentar} (${p.partido_atual ?? "sem partido"}-${p.uf})`,
    description: `Como ${p.nome_parlamentar}, ${cargo.toLowerCase()} por ${p.uf}, votou e o que propôs — com a fonte oficial de cada dado.`,
  };
}

const nomeUF = new Map(ESTADOS.map((e) => [e.uf, e.nome]));

// A mesma pessoa pode ter ficha na Câmara e no Senado (ligadas por nome civil e data de nascimento).
// A página mostra as duas juntas; quem abre a ficha antiga é levado para a do mandato atual.
async function pessoa(id: string) {
  const p = await buscarParlamentar(id);
  if (!p) return null;
  const outra = p.outra_casa_id ? await buscarParlamentar(p.outra_casa_id) : null;
  return { p, outra, ids: [p.id, outra?.id].filter(Boolean).sort() as string[] };
}

const anos = (ini: string, fim: string | null) => `${ini.slice(0, 4)}–${fim ? fim.slice(0, 4) : "hoje"}`;

async function Cabecalho({ params }: { params: Props["params"] }) {
  const { id } = await params;
  const pe = await pessoa(id);
  if (!pe) notFound();
  const { p, outra, ids } = pe;
  if (outra && outra.ativo && !p.ativo) redirect(`/parlamentar/${outra.id}`);
  const [resumo, mand, presidiu] = await Promise.all([resumoVotos(ids), mandatos(ids), presidenciasDoParlamentar(ids)]);
  const porCasa = (["camara", "senado"] as const)
    .map((c) => ({ casa: c, lista: mand.filter((m) => m.casa === c) }))
    .filter((x) => x.lista.length)
    .sort((a, b) => (a.casa === p.casa ? -1 : b.casa === p.casa ? 1 : 0));
  const fichas = [p, outra].filter(Boolean) as NonNullable<typeof outra>[];

  return (
    <>
      <div className={styles.cabecalho}>
        {p.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto_url} alt={`Foto oficial de ${p.nome_parlamentar}`} width={88} height={88} className={styles.foto} />
        ) : (
          <span className={styles.foto} aria-hidden="true" />
        )}
        <div className={styles.identidade}>
          <h1 className={ui.h1}>{p.nome_parlamentar}</h1>
          <p className={ui.apoio}>
            {CASA[p.casa].cargo} · {nomeUF.get(p.uf) ?? p.uf}
            {p.partido_atual ? ` · ${p.partido_atual}` : ""}
            {!p.ativo ? " · fora de exercício" : ""}
          </p>
          {outra && (
            <p className={styles.civil}>
              Também foi {outra.casa === "camara" ? "deputado(a) federal" : "senador(a)"}: a carreira nas duas Casas aparece junta nesta página.
            </p>
          )}
          {p.nome_civil !== p.nome_parlamentar && <p className={styles.civil}>Nome civil: {p.nome_civil}</p>}
          {(["camara", "senado"] as const).map((c) => {
            const xs = presidiu.filter((x) => x.cargo === c);
            if (!xs.length) return null;
            return (
              <p key={c} className={styles.civil}>
                <Link href={`/presidencias?cargo=${c}`}>
                  {xs.some((x) => !x.ano_fim) ? "Preside" : "Presidiu"} {c === "camara" ? "a Câmara" : "o Senado"}
                </Link>
                : {xs.map((x) => (x.ano_fim ? (x.ano_inicio === x.ano_fim ? `${x.ano_inicio}` : `${x.ano_inicio}–${x.ano_fim}`) : `desde ${x.ano_inicio}`)).join(", ")}
              </p>
            );
          })}
        </div>
      </div>

      <div className={styles.acoes}>
        <Suspense fallback={<span className={`${ui.esqueleto} ${styles.seguirEsqueleto}`} />}>
          <Seguir id={p.id} nome={p.nome_parlamentar} />
        </Suspense>
        <Link href={`/comparar?a=${p.id}`} className={ui.botaoSecundario}>
          Comparar com outro
        </Link>
      </div>

      <dl className={styles.numeros}>
        <div className={ui.cartao}>
          <dt>Votações registradas</dt>
          <dd>{numero(resumo.total)}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>Sim · Não</dt>
          <dd>
            {numero(resumo.porTipo.sim)} · {numero(resumo.porTipo.nao)}
          </dd>
        </div>
        <div className={ui.cartao}>
          <dt>Proposições como autor</dt>
          <dd>{numero(resumo.proposicoes)}</dd>
        </div>
      </dl>
      {porCasa.map(({ casa, lista }) => (
        <p key={casa} className={ui.fonte}>
          {lista.length > 1 ? `${lista.length} mandatos ${CASA[casa].na}` : `Mandato ${CASA[casa].na}`}:{" "}
          {lista.map((m) => `${anos(m.inicio, m.fim)} (${[m.partido, m.uf].filter(Boolean).join("-")})`).join(", ")}
        </p>
      ))}
      <p className={ui.fonte}>
        {fichas.map((f, i) => (
          <span key={f.id}>
            {i > 0 && " · "}
            <a href={f.fonte_url}>ficha oficial {f.casa === "camara" ? "na Câmara" : "no Senado"}</a>
          </span>
        ))}
        {outra && " · as duas fichas foram ligadas porque nome civil e data de nascimento são iguais nas duas fontes oficiais"}
      </p>
      <p className={ui.fonte}>
        Votos individuais publicados pela fonte oficial desde{" "}
        {fichas
          .map((f) => f.casa)
          .sort()
          .map((c) => (c === "camara" ? "2001 na Câmara" : "1991 no Senado"))
          .join(" e ")}
        . Partido dos mandatos antigos ainda em conferência.
      </p>
    </>
  );
}

function Abas({ id, aba }: { id: string; aba: string }) {
  const itens = [
    { chave: "votacoes", nome: "Votações" },
    { chave: "proposicoes", nome: "Proposições" },
    { chave: "gastos", nome: "Gastos" },
    { chave: "emendas", nome: "Emendas" },
  ];
  return (
    <nav aria-label="Seções do perfil" className={styles.abas}>
      {itens.map((i) => (
        <Link key={i.chave} href={`/parlamentar/${id}?aba=${i.chave}`} className={styles.aba} aria-current={aba === i.chave ? "page" : undefined} scroll={false}>
          {i.nome}
        </Link>
      ))}
    </nav>
  );
}

function Paginacao({ id, aba, pagina, total }: { id: string; aba: string; pagina: number; total: number }) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (paginas <= 1) return null;
  return (
    <nav className={ui.paginacao} aria-label="Páginas">
      {pagina > 1 ? (
        <Link href={`/parlamentar/${id}?aba=${aba}&pagina=${pagina - 1}`} className={ui.botaoSecundario}>
          ← Anteriores
        </Link>
      ) : (
        <span />
      )}
      <span>
        Página {pagina} de {paginas}
      </span>
      {pagina < paginas ? (
        <Link href={`/parlamentar/${id}?aba=${aba}&pagina=${pagina + 1}`} className={ui.botaoSecundario}>
          Mais →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

async function Conteudo({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const aba = sp.aba === "proposicoes" || sp.aba === "gastos" || sp.aba === "emendas" ? sp.aba : "votacoes";
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const pe = await pessoa(id);
  if (!pe) notFound();
  const { ids } = pe;
  const duasCasas = ids.length > 1;
  const casaDe = (c: "camara" | "senado") => (duasCasas ? <span className={ui.selo}>{c === "camara" ? "Câmara" : "Senado"}</span> : null);

  if (aba === "emendas") {
    const linhas = await emendasDoParlamentar(ids);
    const nomes = await nomesDeMunicipios([...new Set(linhas.map((l) => l.municipio_id).filter((x): x is number => x != null))].sort((a, b) => a - b));
    return (
      <>
        <Abas id={id} aba={aba} />
        <ResumoEmendas linhas={linhas} modo="autor" nomes={nomes} />
        <p className={ui.fonte}>
          Emendas individuais de autoria deste parlamentar no Portal da Transparência. A ligação é feita pelo nome do autor publicado pelo Portal; emendas de
          bancada ou de comissão não entram aqui.
        </p>
      </>
    );
  }

  if (aba === "gastos") {
    const linhas = await gastosDoParlamentar(ids);
    const porAno = new Map<number, number>();
    for (const l of linhas) porAno.set(l.ano, (porAno.get(l.ano) ?? 0) + l.valor);
    const anosLista = [...porAno.keys()].sort((a, b) => b - a);
    const anoPedido = Number(sp.ano);
    const ano = anosLista.includes(anoPedido) ? anoPedido : anosLista[0];
    const doAno = linhas.filter((l) => l.ano === ano);
    const maiorAno = Math.max(...porAno.values(), 1);
    const grupos = (["C", "S"] as const)
      .map((pref) => {
        const xs = doAno.filter((l) => l.parlamentar_id.startsWith(pref));
        const cats = new Map<string, { valor: number; docs: number }>();
        for (const l of xs) {
          const c = cats.get(l.categoria) ?? { valor: 0, docs: 0 };
          c.valor += l.valor;
          c.docs += l.documentos;
          cats.set(l.categoria, c);
        }
        return {
          casa: pref === "C" ? ("camara" as const) : ("senado" as const),
          total: xs.reduce((s2, l) => s2 + l.valor, 0),
          docs: xs.reduce((s2, l) => s2 + l.documentos, 0),
          fonte: xs[0]?.fonte_url,
          mensal: xs.some((l) => l.mes > 0),
          cats: [...cats.entries()].sort((a, b) => b[1].valor - a[1].valor),
        };
      })
      .filter((g) => g.cats.length);
    return (
      <>
        <Abas id={id} aba={aba} />
        {!anosLista.length ? (
          <p className={ui.vazio}>Nenhum gasto da cota parlamentar registrado.</p>
        ) : (
          <>
            <section className={ui.cartao}>
              <h2 className={ui.h2}>Cota parlamentar por ano</h2>
              <p className={ui.apoio}>Toque em um ano para ver as categorias.</p>
              <ul className={styles.anos}>
                {anosLista.map((a) => (
                  <li key={a}>
                    <Link href={`/parlamentar/${id}?aba=gastos&ano=${a}`} scroll={false} aria-current={a === ano ? "true" : undefined} className={styles.anoLink}>
                      <span className={styles.anoRotulo}>{a}</span>
                      <span className={styles.trilho} aria-hidden="true">
                        <span className={styles.barra} style={{ width: `${(porAno.get(a)! / maiorAno) * 100}%` }} />
                      </span>
                      <span className={styles.anoValor}>{reais(porAno.get(a)!)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            {grupos.map((g) => {
              const maior = Math.max(...g.cats.map(([, v]) => v.valor), 1);
              return (
                <section key={g.casa} className={`${ui.cartao} ${styles.gastoAno}`}>
                  <h2 className={ui.h2}>
                    {ano}
                    {duasCasas ? (g.casa === "camara" ? " · Câmara" : " · Senado") : ""}: {reais(g.total)}
                  </h2>
                  <p className={ui.apoio}>
                    {numero(g.docs)} {g.casa === "camara" ? "notas e recibos" : "despesas reembolsadas"}
                    {g.mensal ? "" : " · neste ano o Na Conta guarda o total anual por categoria"}
                  </p>
                  <ul className={styles.categorias}>
                    {g.cats.map(([c, v]) => (
                      <li key={c}>
                        <span className={styles.catNome}>{categoriaLegivel(c)}</span>
                        <span className={styles.trilho} aria-hidden="true">
                          <span className={styles.barra} style={{ width: `${(v.valor / maior) * 100}%` }} />
                        </span>
                        <span className={styles.anoValor}>{reais(v.valor)}</span>
                      </li>
                    ))}
                  </ul>
                  {g.fonte && (
                    <p className={ui.fonte}>
                      Cada nota está no <a href={g.fonte}>arquivo oficial de {ano}</a> ({g.casa === "camara" ? "Câmara dos Deputados, CEAP" : "Senado Federal, CEAPS"}).
                    </p>
                  )}
                </section>
              );
            })}
          </>
        )}
        <p className={ui.fonte}>
          Cota para o Exercício da Atividade Parlamentar: dinheiro público que reembolsa despesas do mandato (escritório, divulgação, passagens,
          combustível etc.). Não inclui salário nem verba de gabinete. Valores líquidos, como publicados pela fonte.
        </p>
      </>
    );
  }

  if (aba === "proposicoes") {
    const { linhas, total } = await proposicoesDoParlamentar(ids, pagina);
    return (
      <>
        <Abas id={id} aba={aba} />
        {linhas.length === 0 ? (
          <p className={ui.vazio}>Nenhuma proposição de autoria registrada no período coletado.</p>
        ) : (
          <ul className={ui.lista}>
            {linhas.map((l) => (
              <li key={l.proposicao_id} className={ui.cartao}>
                <div className={styles.linhaTopo}>
                  <p className={styles.titulo}>
                    <a href={l.fonte_url}>{siglaProposicao(l.tipo, l.numero, l.ano)}</a>
                  </p>
                  <span className={styles.selos}>
                    {casaDe(l.casa)}
                    <span className={ui.selo}>{l.papel === "autor" ? "Autor" : "Coautor"}</span>
                  </span>
                </div>
                <p className={styles.meta}>
                  Apresentada em {data(l.apresentada_em)}
                  {l.situacao ? ` · ${l.situacao}` : ""}
                </p>
                {l.resumo_ia && (
                  <>
                    <p className={ui.rotuloPequeno}>
                      <span className={ui.selo}>Resumo automático</span>
                    </p>
                    <p className={styles.resumo}>{l.resumo_ia}</p>
                  </>
                )}
                <p className={ui.rotuloPequeno}>Ementa oficial</p>
                <p className={ui.oficial}>{l.ementa}</p>
              </li>
            ))}
          </ul>
        )}
        <Paginacao id={id} aba={aba} pagina={pagina} total={total} />
        <p className={ui.fonte}>
          {numero(total)} proposições ·{" "}
          {ids
            .map((i) =>
              i.startsWith("S-")
                ? "Senado: PL, PLS, PLP, PEC, PDL, PDS, PRS e PRN (projetos vindos da Câmara não entram)"
                : "Câmara: PL, PLP, PEC, PDL, PDC, PRC, MPV e PLV",
            )
            .join(" · ")}{" "}
          · fonte: dados abertos {duasCasas ? "da Câmara e do Senado" : ids[0].startsWith("S-") ? "do Senado" : "da Câmara"}.
        </p>
      </>
    );
  }

  const { linhas, total } = await votosDoParlamentar(ids, pagina);
  return (
    <>
      <Abas id={id} aba={aba} />
      {linhas.length === 0 ? (
        <p className={ui.vazio}>Nenhum voto nominal registrado no período coletado.</p>
      ) : (
        <ul className={ui.lista}>
          {linhas.map((l) => {
            const cor = VOTO[l.voto];
            return (
              <li key={l.votacao_id} className={ui.cartao}>
                <div className={styles.linhaTopo}>
                  <p className={styles.titulo}>
                    <Link href={`/votacao/${l.votacao_id}`}>
                      {l.proposicao_tipo ? siglaProposicao(l.proposicao_tipo, l.proposicao_numero, l.proposicao_ano) : "Votação nominal"}
                    </Link>
                  </p>
                  <span className={styles.selos}>
                    {casaDe(l.casa)}
                    <span className={ui.etiqueta} style={{ background: cor.fundo, color: cor.texto }}>
                      {rotuloVoto(l.voto, l.voto_original)}
                    </span>
                  </span>
                </div>
                <p className={styles.meta}>
                  {data(l.data)}
                  {l.resultado ? ` · ${l.resultado === "aprovada" ? "Aprovada" : "Rejeitada"}` : ""}
                  {l.placar_sim != null ? ` · placar ${l.placar_sim} × ${l.placar_nao}` : ""}
                </p>
                <p className={styles.descricao}>{l.descricao}</p>
              </li>
            );
          })}
        </ul>
      )}
      <Paginacao id={id} aba={aba} pagina={pagina} total={total} />
      <p className={ui.fonte}>{numero(total)} votos nominais · Fonte: dados abertos da Câmara e do Senado.</p>
    </>
  );
}

export default function Parlamentar(props: Props) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <p className={ui.trilha}>
          <Link href="/parlamentares">← Parlamentares</Link>
        </p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ height: 260, marginTop: 16 }} aria-label="Carregando" />}>
          <Cabecalho params={props.params} />
        </Suspense>
        <Suspense fallback={<div className={ui.esqueleto} style={{ height: 480, marginTop: 24 }} aria-label="Carregando" />}>
          <Conteudo {...props} />
        </Suspense>
      </main>
    </>
  );
}
