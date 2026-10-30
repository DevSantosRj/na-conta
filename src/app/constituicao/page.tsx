import type { Metadata } from "next";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { artigosPublicados } from "@/lib/dados";
import { data } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Constituição em linguagem simples",
  description: "Artigos da Constituição Federal explicados em linguagem simples, sempre com o texto oficial ao lado e revisados por advogado.",
};

const CF = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";

async function Artigos() {
  const artigos = await artigosPublicados();
  if (!artigos.length) {
    return (
      <section className={ui.cartao} style={{ marginTop: 20 }}>
        <h2 className={ui.h2}>Em revisão jurídica</h2>
        <p className={ui.apoio}>
          Cada explicação em linguagem simples só vai ao ar depois de revisada por um advogado, com o nome do revisor e a data publicados aqui. Ainda não há
          artigos revisados.
        </p>
        <p className={ui.apoio}>
          Enquanto isso, o texto oficial completo está no site do Planalto: <a href={CF}>Constituição da República Federativa do Brasil de 1988</a>.
        </p>
      </section>
    );
  }
  return (
    <ul className={ui.lista} style={{ marginTop: 20 }}>
      {artigos.map((a) => (
        <li key={a.id} id={a.id} className={ui.cartao}>
          <h2 className={ui.h2}>{a.titulo}</h2>
          {a.texto_simples && <p>{a.texto_simples}</p>}
          {a.por_que_importa && (
            <p className={ui.apoio}>
              <strong>Por que importa:</strong> {a.por_que_importa}
            </p>
          )}
          <p className={ui.rotuloPequeno}>Texto oficial</p>
          <p className={ui.oficial}>{a.texto_oficial}</p>
          <p className={ui.fonte}>
            Revisado por {a.revisado_por} em {data(a.revisado_em)} · <a href={CF}>texto completo no Planalto</a>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function Constituicao() {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Constituição em linguagem simples</h1>
        <p className={ui.apoio}>Os artigos que explicam o que você vê no Na Conta: cadeiras por estado, mandatos, orçamento, emendas e repartição de impostos.</p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ minHeight: "100svh", height: 240, marginTop: 20 }} aria-label="Carregando" />}>
          <Artigos />
        </Suspense>
      </main>
    </>
  );
}
