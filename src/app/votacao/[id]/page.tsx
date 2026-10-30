import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { buscarVotacao } from "@/lib/dados";
import { CASA, data, numero, rotuloVoto, siglaProposicao, VOTO, type Voto } from "@/lib/formato";
import styles from "./votacao.module.css";

type Props = PageProps<"/votacao/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await buscarVotacao(id);
  if (!r) return { title: "Votação não encontrada" };
  const p = r.votacao.proposicoes;
  return {
    title: `${p ? siglaProposicao(p.tipo, p.numero, p.ano) : "Votação nominal"} · ${data(r.votacao.data)}`,
    description: r.votacao.descricao,
  };
}

const ORDEM: Voto[] = ["sim", "nao", "abstencao", "obstrucao", "outro", "ausente"];

async function Votacao({ params }: Props) {
  const { id } = await params;
  const r = await buscarVotacao(id);
  if (!r) notFound();
  const { votacao: v, votos, orientacoes } = r;
  const p = v.proposicoes as { id: string; tipo: string; numero: number; ano: number; ementa: string; resumo_ia: string | null; fonte_url: string } | null;

  const grupos = ORDEM.map((voto) => ({
    voto,
    lista: votos.filter((x) => x.voto === voto).sort((a, b) => a.parlamentares.nome_parlamentar.localeCompare(b.parlamentares.nome_parlamentar, "pt-BR")),
  })).filter((g) => g.lista.length);

  const placarSim = v.placar_sim ?? votos.filter((x) => x.voto === "sim").length;
  const placarNao = v.placar_nao ?? votos.filter((x) => x.voto === "nao").length;

  return (
    <>
      <p className={styles.sobre}>
        {CASA[v.casa as "camara" | "senado"].nome} · {data(v.data)}
      </p>
      <h1 className={ui.h1}>{p ? siglaProposicao(p.tipo, p.numero, p.ano) : "Votação nominal"}</h1>
      <p className={styles.descricao}>{v.descricao}</p>

      <div className={styles.placar}>
        <div className={styles.lado} style={{ background: VOTO.sim.fundo, color: VOTO.sim.texto }}>
          <span>Sim</span>
          <strong>{numero(placarSim)}</strong>
        </div>
        <div className={styles.lado} style={{ background: VOTO.nao.fundo, color: VOTO.nao.texto }}>
          <span>Não</span>
          <strong>{numero(placarNao)}</strong>
        </div>
        {v.resultado && <p className={styles.resultado}>{v.resultado === "aprovada" ? "Aprovada" : "Rejeitada"}</p>}
      </div>

      {p && (
        <section className={ui.cartao} style={{ marginTop: 16 }}>
          <h2 className={ui.h2}>O que estava em votação</h2>
          {p.resumo_ia && (
            <>
              <p className={ui.rotuloPequeno}>
                <span className={ui.selo}>Resumo automático</span>
              </p>
              <p className={styles.resumo}>{p.resumo_ia}</p>
            </>
          )}
          <p className={ui.rotuloPequeno}>Ementa oficial</p>
          <p className={ui.oficial}>{p.ementa}</p>
          <p className={ui.fonte}>
            <a href={p.fonte_url}>Ficha oficial da proposição</a>
          </p>
        </section>
      )}

      {votos.length === 0 ? (
        <p className={ui.vazio} style={{ marginTop: 16 }}>
          A fonte oficial publicou o placar, mas não o voto de cada parlamentar nesta votação.
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.voto} className={styles.grupo} aria-labelledby={`g-${g.voto}`}>
            <h2 id={`g-${g.voto}`} className={styles.grupoTitulo}>
              <span className={ui.etiqueta} style={{ background: VOTO[g.voto].fundo, color: VOTO[g.voto].texto }}>
                {VOTO[g.voto].rotulo}
              </span>
              <span>{numero(g.lista.length)}</span>
            </h2>
            <ul className={styles.nomes}>
              {g.lista.map((x) => (
                <li key={x.parlamentares.id}>
                  <Link href={`/parlamentar/${x.parlamentares.id}`}>{x.parlamentares.nome_parlamentar}</Link>
                  <span className={styles.partido}>
                    {x.parlamentares.partido_atual ?? "—"}-{x.parlamentares.uf}
                    {g.voto === "outro" && x.voto_original ? ` · ${rotuloVoto("outro", x.voto_original)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {orientacoes.length > 0 && (
        <section className={styles.grupo}>
          <h2 className={ui.h2}>Orientação dos partidos e blocos</h2>
          <ul className={styles.orientacoes}>
            {orientacoes.map((o) => (
              <li key={o.partido}>
                <span>{o.partido}</span>
                <strong>{o.orientacao}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={ui.fonte}>
        Partido e UF exibidos são os atuais de cada parlamentar · <a href={v.fonte_url}>fonte oficial da votação</a>
      </p>
    </>
  );
}

export default function PaginaVotacao(props: Props) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <Suspense fallback={<div className={ui.esqueleto} style={{ minHeight: "100svh", height: 520 }} aria-label="Carregando" />}>
          <Votacao {...props} />
        </Suspense>
      </main>
    </>
  );
}
