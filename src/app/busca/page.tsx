import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListaParlamentares } from "@/components/ListaParlamentares";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { buscarProposicoes, listarParlamentares, todosMunicipios } from "@/lib/dados";
import { semAcento, siglaProposicao } from "@/lib/formato";
import styles from "../parlamentares/parlamentares.module.css";

export const metadata: Metadata = {
  title: "Busca",
  description: "Procure um parlamentar, uma cidade ou um projeto de lei (por número, como PL 1234/2023, ou por palavras da ementa).",
};

async function Resultados({ searchParams }: { searchParams: PageProps<"/busca">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 120) : "";
  const formulario = (
    <form className={styles.filtros} role="search" style={{ gridTemplateColumns: "1fr auto" }}>
      <div className={styles.campoBusca}>
        <label htmlFor="q" className={styles.rotulo}>
          O que você procura?
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Ex.: Maria, Niterói, PL 1234/2023, saneamento" className={styles.campo} />
      </div>
      <button type="submit" className={ui.botao}>
        Buscar
      </button>
    </form>
  );
  if (q.length < 2) return formulario;

  const termo = semAcento(q);
  const [parlamentares, municipios, proposicoes] = await Promise.all([listarParlamentares(), todosMunicipios(), q.length >= 3 ? buscarProposicoes(q) : []]);
  const pessoas = parlamentares.filter((p) => p.ativo && semAcento(p.nome_parlamentar).includes(termo)).slice(0, 24);
  const cidades = municipios.filter((m) => semAcento(m.nome).includes(termo)).slice(0, 24);

  return (
    <>
      {formulario}
      <section className={styles.secaoBusca} aria-labelledby="r-parl">
        <h2 id="r-parl" className={ui.h2}>
          Parlamentares em exercício ({pessoas.length})
        </h2>
        {pessoas.length ? <ListaParlamentares itens={pessoas} /> : <p className={ui.vazio}>Nenhum parlamentar com esse nome.</p>}
      </section>
      <section className={styles.secaoBusca} aria-labelledby="r-cid">
        <h2 id="r-cid" className={ui.h2}>
          Cidades ({cidades.length})
        </h2>
        {cidades.length ? (
          <ul className={styles.listaSimples}>
            {cidades.map((m) => (
              <li key={m.ibge_id}>
                <Link href={`/municipio/${m.ibge_id}`}>
                  {m.nome} ({m.uf})
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.vazio}>Nenhuma cidade com esse nome.</p>
        )}
      </section>
      <section className={styles.secaoBusca} aria-labelledby="r-prop">
        <h2 id="r-prop" className={ui.h2}>
          Proposições ({proposicoes.length})
        </h2>
        <p className={ui.apoio}>Procura o número (ex.: PL 1234/2023) ou palavras da ementa oficial. Mostra até 20, das mais recentes.</p>
        {proposicoes.length ? (
          <ul className={ui.lista}>
            {proposicoes.map((p) => (
              <li key={p.id} className={ui.cartao}>
                <p className={styles.nome}>
                  <a href={p.fonte_url}>{siglaProposicao(p.tipo, p.numero, p.ano)}</a> · {p.casa === "camara" ? "Câmara" : "Senado"}
                </p>
                <p className={ui.oficial}>{p.ementa}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.vazio}>Nenhuma proposição encontrada.</p>
        )}
      </section>
    </>
  );
}

export default function Busca(props: PageProps<"/busca">) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Busca</h1>
        <p className={ui.apoio}>Parlamentares, cidades e projetos de lei num lugar só.</p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ height: 240, marginTop: 20 }} aria-label="Carregando" />}>
          <Resultados searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
