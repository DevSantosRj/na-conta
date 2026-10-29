import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListaParlamentares } from "@/components/ListaParlamentares";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { doEstado, ESTADOS } from "@/dados/estados";
import { estados, listarParlamentares } from "@/lib/dados";
import { numero } from "@/lib/formato";
import styles from "./estado.module.css";

type Props = PageProps<"/estado/[uf]">;

export function generateStaticParams() {
  return ESTADOS.map((e) => ({ uf: e.uf.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf } = await params;
  const e = ESTADOS.find((x) => x.uf === uf.toUpperCase());
  if (!e) return { title: "Estado não encontrado" };
  return {
    title: `${e.nome}: bancada no Congresso`,
    description: `Quem representa os eleitores ${doEstado(e.uf, e.nome)} na Câmara e no Senado, quantos habitantes cada deputado representa e a bancada por partido — com a fonte oficial de cada dado.`,
  };
}

async function Conteudo({ params }: { params: Props["params"] }) {
  const { uf: bruto } = await params;
  const uf = bruto.toUpperCase();
  const todos = await estados();
  const e = todos.find((x) => x.uf === uf);
  if (!e) notFound();

  const parlamentares = (await listarParlamentares()).filter((p) => p.ativo && p.uf === uf);
  const senadores = parlamentares.filter((p) => p.casa === "senado");
  const deputados = parlamentares.filter((p) => p.casa === "camara");

  // Habitantes por deputado: compara com a média nacional (população do país ÷ 513)
  const popBrasil = todos.reduce((s, x) => s + (x.populacao ?? 0), 0);
  const cadeirasBrasil = todos.reduce((s, x) => s + x.cadeiras_camara, 0);
  const porDeputado = e.populacao ? Math.round(e.populacao / e.cadeiras_camara) : null;
  const mediaBrasil = popBrasil ? Math.round(popBrasil / cadeirasBrasil) : null;
  const ranking = todos
    .filter((x) => x.populacao)
    .map((x) => ({ uf: x.uf, v: x.populacao! / x.cadeiras_camara }))
    .sort((a, b) => b.v - a.v);
  const posicao = ranking.findIndex((x) => x.uf === uf) + 1;

  // Bancada por partido (deputados e senadores em exercício)
  const porPartido = new Map<string, { dep: number; sen: number }>();
  for (const p of parlamentares) {
    const k = p.partido_atual || "Sem partido";
    const atual = porPartido.get(k) ?? { dep: 0, sen: 0 };
    if (p.casa === "camara") atual.dep++;
    else atual.sen++;
    porPartido.set(k, atual);
  }
  const partidos = [...porPartido.entries()].sort((a, b) => b[1].dep + b[1].sen - (a[1].dep + a[1].sen) || a[0].localeCompare(b[0]));
  const maior = Math.max(...partidos.map(([, v]) => v.dep + v.sen), 1);

  return (
    <>
      <h1 className={ui.h1}>{e.nome}</h1>
      <p className={ui.apoio}>
        Região {e.regiao} · {e.cadeiras_camara} deputados federais e 3 senadores
      </p>

      <dl className={styles.numeros}>
        <div className={ui.cartao}>
          <dt>Deputados federais</dt>
          <dd>{e.cadeiras_camara}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>População{e.populacao_ano ? ` (${e.populacao_ano})` : ""}</dt>
          <dd>{e.populacao ? numero(e.populacao) : "—"}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>Habitantes por deputado</dt>
          <dd>{porDeputado ? numero(porDeputado) : "—"}</dd>
        </div>
      </dl>
      {porDeputado && mediaBrasil && (
        <p className={styles.explica}>
          Cada deputado {doEstado(e.uf, e.nome)} representa em média {numero(porDeputado)} habitantes. A média do país é de {numero(mediaBrasil)}{" "}
          habitantes por deputado. No número de habitantes por deputado, {e.nome} ocupa a {posicao}ª posição entre as 27 unidades da federação
          (da maior para a menor). A Constituição fixa no mínimo 8 e no máximo 70
          deputados por estado (
          <a href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art45">art. 45, § 1º</a>); cada estado tem 3 senadores (
          <a href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art46">art. 46</a>).
        </p>
      )}
      <p className={ui.fonte}>
        População: <a href={e.fonte_url}>IBGE, estimativa {e.populacao_ano ?? ""}</a> · cadeiras: Câmara dos Deputados, 57ª legislatura
      </p>

      <section className={styles.secao} aria-labelledby="partidos">
        <h2 id="partidos" className={ui.h2}>
          Bancada por partido
        </h2>
        <p className={ui.apoio}>Deputados e senadores em exercício, pelo partido atual de cada um.</p>
        <ul className={styles.barras}>
          {partidos.map(([partido, v]) => (
            <li key={partido}>
              <span className={styles.partido}>{partido}</span>
              <span className={styles.trilho} aria-hidden="true">
                <span className={styles.barra} style={{ width: `${((v.dep + v.sen) / maior) * 100}%` }} />
              </span>
              <span className={styles.qtd}>
                {[v.dep ? `${v.dep} dep.` : "", v.sen ? `${v.sen} sen.` : ""].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.secao} aria-labelledby="senado">
        <h2 id="senado" className={ui.h2}>
          Senadores ({senadores.length})
        </h2>
        <ListaParlamentares itens={senadores} />
      </section>

      <section className={styles.secao} aria-labelledby="camara">
        <h2 id="camara" className={ui.h2}>
          Deputados federais em exercício ({deputados.length})
        </h2>
        {deputados.length !== e.cadeiras_camara && (
          <p className={ui.apoio}>
            O número em exercício pode diferir das {e.cadeiras_camara} cadeiras quando há licenças, posses de suplentes ou vagas.
          </p>
        )}
        <ListaParlamentares itens={deputados} />
      </section>
      <p className={ui.fonte}>Fontes: Câmara dos Deputados e Senado Federal (dados abertos).</p>
    </>
  );
}

export default function Estado(props: Props) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <p className={ui.trilha}>
          <Link href="/">← Mapa do Brasil</Link>
        </p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ height: 640, marginTop: 16 }} aria-label="Carregando" />}>
          <Conteudo params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
