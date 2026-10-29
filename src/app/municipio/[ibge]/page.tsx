import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResumoEmendas } from "@/components/ResumoEmendas";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { ESTADOS } from "@/dados/estados";
import { emendasDoMunicipio, municipio } from "@/lib/dados";
import { numero } from "@/lib/formato";

type Props = PageProps<"/municipio/[ibge]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ibge } = await params;
  const m = /^\d{7}$/.test(ibge) ? await municipio(Number(ibge)) : null;
  if (!m) return { title: "Município não encontrado" };
  return {
    title: `${m.nome} (${m.uf}): emendas parlamentares`,
    description: `Quanto ${m.nome} recebeu em emendas parlamentares desde 2014, quem indicou e para quais áreas — com a fonte oficial.`,
  };
}

async function Conteudo({ params }: { params: Props["params"] }) {
  const { ibge } = await params;
  if (!/^\d{7}$/.test(ibge)) notFound();
  const m = await municipio(Number(ibge));
  if (!m) notFound();
  const linhas = await emendasDoMunicipio(m.ibge_id);
  const estado = ESTADOS.find((e) => e.uf === m.uf);
  return (
    <>
      <p className={ui.trilha}>
        <Link href={`/estado/${m.uf.toLowerCase()}`}>← {estado?.nome ?? m.uf}</Link>
      </p>
      <h1 className={ui.h1}>{m.nome}</h1>
      <p className={ui.apoio}>
        {estado?.nome ?? m.uf}
        {m.populacao ? ` · ${numero(m.populacao)} habitantes (IBGE, ${m.populacao_ano})` : ""}
      </p>
      <h2 className={ui.h2} style={{ marginTop: 28 }}>
        Emendas parlamentares recebidas desde 2014
      </h2>
      <ResumoEmendas linhas={linhas} modo="destino" />
      <p className={ui.fonte}>
        Só entram emendas que o Portal da Transparência liga ao código IBGE do município. Emendas para o estado inteiro ou para instituições federais
        aparecem na página do estado. População: <a href={m.fonte_url}>IBGE</a>.
      </p>
    </>
  );
}

export default function Municipio(props: Props) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <Suspense fallback={<div className={ui.esqueleto} style={{ height: 640, marginTop: 16 }} aria-label="Carregando" />}>
          <Conteudo params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
