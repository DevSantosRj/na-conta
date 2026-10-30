import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { ESTADOS } from "@/dados/estados";
import { estados, pactoFederativo } from "@/lib/dados";
import { reais, reaisCurto } from "@/lib/formato";
import styles from "./pacto.module.css";

export const metadata: Metadata = {
  title: "Pacto federativo: quanto cada estado arrecada e quanto volta",
  description:
    "Tributos federais arrecadados em cada estado e repasses constitucionais da União ao governo estadual e às prefeituras, ano a ano, com a fonte oficial.",
};

const CF = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";
const ARRECADACAO = "https://www.gov.br/receitafederal/dados/arrecadacao-estado.csv";
const TESOURO = "https://www.tesourotransparente.gov.br/ckan/dataset/transferencias-constitucionais-para-estados";

const ORDENS = {
  nome: "Estado",
  arrecadacao: "Arrecadação",
  repasse: "Repasses",
  proporcao: "Repasse a cada R$ 100",
  habitante: "Repasse por habitante",
} as const;
type Ordem = keyof typeof ORDENS;

async function Conteudo({ searchParams }: { searchParams: PageProps<"/pacto-federativo">["searchParams"] }) {
  const sp = await searchParams;
  const [linhas, infos] = await Promise.all([pactoFederativo(), estados()]);
  const anos = [...new Set(linhas.map((l) => l.ano))].sort((a, b) => b - a);
  const completo = (a: number) => linhas.filter((l) => l.ano === a).every((l) => l.meses_arrecadacao === 12 && l.meses_transferencias === 12);
  const padrao = anos.find(completo) ?? anos[0];
  const pedido = Number(sp.ano);
  const ano = anos.includes(pedido) ? pedido : padrao;
  const ordem: Ordem = typeof sp.ordem === "string" && sp.ordem in ORDENS ? (sp.ordem as Ordem) : "nome";

  const pop = new Map(infos.map((e) => [e.uf, e.populacao ?? 0]));
  const popAno = infos.find((e) => e.populacao_ano)?.populacao_ano;
  const nome = new Map(ESTADOS.map((e) => [e.uf, e.nome]));
  const doAno = linhas
    .filter((l) => l.ano === ano)
    .map((l) => {
      const repasse = l.transferencias_estado + l.transferencias_municipios;
      const p = pop.get(l.uf) || 0;
      return { ...l, nome: nome.get(l.uf) ?? l.uf, repasse, proporcao: l.arrecadacao ? (repasse / l.arrecadacao) * 100 : 0, habitante: p ? repasse / p : 0, arrecHab: p ? l.arrecadacao / p : 0 };
    });
  const chave: Record<Ordem, (x: (typeof doAno)[number]) => number | string> = {
    nome: (x) => x.nome,
    arrecadacao: (x) => -x.arrecadacao,
    repasse: (x) => -x.repasse,
    proporcao: (x) => -x.proporcao,
    habitante: (x) => -x.habitante,
  };
  doAno.sort((a, b) => {
    const va = chave[ordem](a);
    const vb = chave[ordem](b);
    return typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : va - (vb as number);
  });
  const totArrec = doAno.reduce((s, x) => s + x.arrecadacao, 0);
  const totRep = doAno.reduce((s, x) => s + x.repasse, 0);
  const totPop = [...pop.values()].reduce((s, v) => s + v, 0);
  const meses = doAno[0]?.meses_arrecadacao ?? 12;
  const mesesT = doAno[0]?.meses_transferencias ?? 12;
  const parcial = meses < 12 || mesesT < 12;
  const link = (o: Ordem) => `/pacto-federativo?ano=${ano}${o === "nome" ? "" : `&ordem=${o}`}`;

  return (
    <>
      <nav className={styles.anos} aria-label="Ano">
        {anos.map((a) => (
          <Link key={a} href={`/pacto-federativo?ano=${a}${ordem === "nome" ? "" : `&ordem=${ordem}`}`} aria-current={a === ano ? "page" : undefined}>
            {a}
          </Link>
        ))}
      </nav>

      <dl className={styles.numeros}>
        <div className={ui.cartao}>
          <dt>Tributos federais arrecadados em {ano}</dt>
          <dd>{reaisCurto(totArrec)}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>Repasses constitucionais da União</dt>
          <dd>{reaisCurto(totRep)}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>Repasse a cada R$ 100 arrecadados</dt>
          <dd>R$ {(totArrec ? (totRep / totArrec) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</dd>
        </div>
      </dl>
      {parcial && (
        <p className={styles.aviso}>
          {ano === anos[0]
            ? `${ano} ainda está em andamento: arrecadação de ${meses} ${meses === 1 ? "mês" : "meses"} e repasses de ${mesesT} ${mesesT === 1 ? "mês" : "meses"}.`
            : `Para ${ano}, o Tesouro publicou os repasses de ${mesesT} dos 12 meses; o mês que falta não está nos arquivos oficiais, então o total de repasses fica menor que o real.`}
        </p>
      )}

      <div className={styles.rolagem}>
        <table className={styles.tabela}>
          <caption className="sr-only">
            Arrecadação federal e repasses constitucionais por estado em {ano}
          </caption>
          <thead>
            <tr>
              {(Object.keys(ORDENS) as Ordem[]).map((o) => (
                <th key={o} scope="col" aria-sort={o === ordem ? (o === "nome" ? "ascending" : "descending") : undefined}>
                  <Link href={link(o)}>{ORDENS[o]}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doAno.map((x) => (
              <tr key={x.uf}>
                <th scope="row">
                  <Link href={`/estado/${x.uf.toLowerCase()}#pacto`}>{x.nome}</Link>
                </th>
                <td>
                  {reaisCurto(x.arrecadacao)}
                  <small>{reais(x.arrecHab)} por habitante</small>
                </td>
                <td>
                  {reaisCurto(x.repasse)}
                  <small>
                    estado {reaisCurto(x.transferencias_estado)} · prefeituras {reaisCurto(x.transferencias_municipios)}
                  </small>
                </td>
                <td>R$ {x.proporcao.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                <td>{reais(x.habitante)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Brasil</th>
              <td>
                {reaisCurto(totArrec)}
                <small>{reais(totPop ? totArrec / totPop : 0)} por habitante</small>
              </td>
              <td>{reaisCurto(totRep)}</td>
              <td>R$ {(totArrec ? (totRep / totArrec) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
              <td>{reais(totPop ? totRep / totPop : 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className={ui.fonte}>
        Arrecadação: <a href={ARRECADACAO}>Receita Federal, arrecadação por estado</a> · Repasses:{" "}
        <a href={TESOURO}>Tesouro Nacional, transferências constitucionais (estados e municípios)</a> · População: IBGE, estimativa {popAno ?? ""}
      </p>
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/pacto-federativo">) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Pacto federativo</h1>
        <p className={ui.apoio}>
          Quanto de tributo federal é arrecadado em cada estado e quanto a União repassa de volta, por obrigação constitucional, ao governo do
          estado e às prefeituras.
        </p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ minHeight: "100svh", height: 480, marginTop: 20 }} aria-label="Carregando" />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>

        <section className={styles.secao} aria-labelledby="como-ler">
          <h2 id="como-ler" className={ui.h2}>
            Como ler estes números
          </h2>
          <ul className={styles.notas}>
            <li>
              <strong>Onde o tributo é registrado.</strong> A Receita atribui a arrecadação ao estado do domicílio de quem paga. Grandes empresas
              recolhem pela sede, por isso estados com muitas sedes (como São Paulo, Rio de Janeiro e o Distrito Federal) aparecem com valores que
              incluem tributos gerados em outros lugares.
            </li>
            <li>
              <strong>O que entra como repasse.</strong> São as transferências obrigatórias previstas na Constituição (
              <a href={`${CF}#art157`}>arts. 157 a 162</a>): FPE, FPM, a parte federal do FUNDEB e a complementação da União, royalties, IPI-Exportação,
              ITR, IOF-Ouro, CIDE-Combustíveis e compensações por lei complementar. A parte do FUNDEB formada por impostos do próprio estado (ICMS, IPVA,
              ITCMD) não entra, porque não é dinheiro da União.
            </li>
            <li>
              <strong>O que não está aqui.</strong> Outros gastos federais no estado — saúde (SUS), aposentadorias do INSS, programas sociais, salários
              de servidores federais, obras e emendas parlamentares — não são repasses constitucionais. As emendas estão na página de cada estado.
            </li>
            <li>
              <strong>Valores nominais.</strong> Em reais de cada ano, sem correção pela inflação. O valor por habitante usa a estimativa de população
              mais recente do IBGE.
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
