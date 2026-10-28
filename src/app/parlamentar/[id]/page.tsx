import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { buscarParlamentar, mandatos, POR_PAGINA, proposicoesDoParlamentar, resumoVotos, votosDoParlamentar } from "@/lib/dados";
import { CASA, data, numero, rotuloVoto, siglaProposicao, VOTO } from "@/lib/formato";
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

async function Cabecalho({ params }: { params: Props["params"] }) {
  const { id } = await params;
  const p = await buscarParlamentar(id);
  if (!p) notFound();
  const [resumo, mand] = await Promise.all([resumoVotos(id), mandatos(id)]);

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
          {p.nome_civil !== p.nome_parlamentar && <p className={styles.civil}>Nome civil: {p.nome_civil}</p>}
        </div>
      </div>

      <div className={styles.acoes}>
        <Suspense fallback={<span className={`${ui.esqueleto} ${styles.seguirEsqueleto}`} />}>
          <Seguir id={p.id} nome={p.nome_parlamentar} />
        </Suspense>
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
      <p className={ui.fonte}>
        {mand.length > 1 ? `${mand.length} mandatos ${CASA[p.casa].na}` : `Mandato ${CASA[p.casa].na}`}:{" "}
        {mand
          .map((m) => `${m.inicio.slice(0, 4)}–${m.fim ? m.fim.slice(0, 4) : "hoje"} (${[m.partido, m.uf].filter(Boolean).join("-")})`)
          .join(", ")}{" "}
        · <a href={p.fonte_url}>fonte oficial</a>
      </p>
      <p className={ui.fonte}>
        Votos individuais publicados pela fonte oficial desde {p.casa === "camara" ? "2001" : "1991"}. Partido dos mandatos antigos ainda
        em conferência.
      </p>
    </>
  );
}

function Abas({ id, aba }: { id: string; aba: string }) {
  const itens = [
    { chave: "votacoes", nome: "Votações" },
    { chave: "proposicoes", nome: "Proposições" },
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
  const aba = sp.aba === "proposicoes" ? "proposicoes" : "votacoes";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  if (aba === "proposicoes") {
    const { linhas, total } = await proposicoesDoParlamentar(id, pagina);
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
                  <span className={ui.selo}>{l.papel === "autor" ? "Autor" : "Coautor"}</span>
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
          {numero(total)} proposições · PL, PLP, PEC, PDL, PRC, MPV e PLV · Fonte: dados abertos da Câmara e do Senado.
        </p>
      </>
    );
  }

  const { linhas, total } = await votosDoParlamentar(id, pagina);
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
                  <span className={ui.etiqueta} style={{ background: cor.fundo, color: cor.texto }}>
                    {rotuloVoto(l.voto, l.voto_original)}
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
