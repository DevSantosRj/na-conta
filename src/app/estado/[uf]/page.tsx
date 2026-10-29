import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListaParlamentares } from "@/components/ListaParlamentares";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { doEstado, ESTADOS } from "@/dados/estados";
import { emendasDoEstado, estados, listarParlamentares, municipiosDoEstado, pactoFederativo, transferenciasDoEstado } from "@/lib/dados";
import { numero, reais, reaisCurto } from "@/lib/formato";
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

  const [lista, emendas, municipios, pactoTodos, grupos] = await Promise.all([
    listarParlamentares(),
    emendasDoEstado(uf),
    municipiosDoEstado(uf),
    pactoFederativo(),
    transferenciasDoEstado(uf),
  ]);
  // Pacto federativo: anos do estado, do mais recente ao mais antigo
  const pacto = pactoTodos.filter((l) => l.uf === uf).sort((a, b) => b.ano - a.ano);
  const anoCompleto = pacto.find((l) => l.meses_arrecadacao === 12 && l.meses_transferencias === 12)?.ano;
  const ultimo = pacto.find((l) => l.ano === anoCompleto);
  const gruposAno = grupos.filter((g) => g.ano === anoCompleto);
  const porGrupo = new Map<string, { estado: number; municipios: number; federal: boolean }>();
  for (const g of gruposAno) {
    const v = porGrupo.get(g.grupo) ?? { estado: 0, municipios: 0, federal: g.federal };
    v[g.destino] += g.valor;
    porGrupo.set(g.grupo, v);
  }
  const gruposOrdenados = [...porGrupo.entries()].filter(([, v]) => v.federal).sort((a, b) => b[1].estado + b[1].municipios - (a[1].estado + a[1].municipios));
  const estaduais = porGrupo.get("FUNDEB – impostos estaduais");
  const parlamentares = lista.filter((p) => p.ativo && p.uf === uf);
  const nomeMun = new Map(municipios.map((m) => [m.ibge_id, m.nome]));
  const maiorAno = Math.max(...emendas.porAno.map((a) => a.empenhado), 1);
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

      <section className={styles.secao} aria-labelledby="pacto">
        <h2 id="pacto" className={ui.h2}>
          Pacto federativo
        </h2>
        <p className={ui.apoio}>
          Tributos federais arrecadados no estado e repasses constitucionais da União ao governo estadual e às prefeituras.{" "}
          <Link href="/pacto-federativo">Comparar com os outros estados</Link>
        </p>
        {ultimo && (
          <>
            <dl className={styles.numeros}>
              <div className={ui.cartao}>
                <dt>Arrecadação federal em {ultimo.ano}</dt>
                <dd>{reaisCurto(ultimo.arrecadacao)}</dd>
              </div>
              <div className={ui.cartao}>
                <dt>Repasses da União em {ultimo.ano}</dt>
                <dd>{reaisCurto(ultimo.transferencias_estado + ultimo.transferencias_municipios)}</dd>
              </div>
              <div className={ui.cartao}>
                <dt>Repasse a cada R$ 100 arrecadados</dt>
                <dd>
                  R${" "}
                  {(ultimo.arrecadacao ? ((ultimo.transferencias_estado + ultimo.transferencias_municipios) / ultimo.arrecadacao) * 100 : 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
            </dl>
            <h3 className={styles.h3}>Repasses de {ultimo.ano} por tipo</h3>
            <ul className={styles.ranking}>
              {gruposOrdenados.map(([grupo, v]) => (
                <li key={grupo}>
                  <span>{grupo}</span>
                  <span className={styles.qtd}>
                    {reaisCurto(v.estado + v.municipios)} · estado {reaisCurto(v.estado)} · prefeituras {reaisCurto(v.municipios)}
                  </span>
                </li>
              ))}
            </ul>
            {estaduais && (
              <p className={styles.explica}>
                Fora da conta: {reaisCurto(estaduais.estado + estaduais.municipios)} do FUNDEB formados por impostos do próprio estado (ICMS, IPVA,
                ITCMD), que o Tesouro distribui mas não são dinheiro da União.
              </p>
            )}
          </>
        )}
        <h3 className={styles.h3}>Ano a ano</h3>
        <ul className={styles.ranking}>
          {pacto.map((l) => (
            <li key={l.ano}>
              <span>
                {l.ano}
                {(l.meses_arrecadacao < 12 || (l.meses_transferencias ?? 12) < 12) && (
                  <small> ({l.meses_transferencias ?? l.meses_arrecadacao} meses)</small>
                )}
              </span>
              <span className={styles.qtd}>
                arrecadação {reaisCurto(l.arrecadacao)} · repasses {reaisCurto(l.transferencias_estado + l.transferencias_municipios)}
              </span>
            </li>
          ))}
        </ul>
        <p className={ui.fonte}>
          Fontes: <a href="https://www.gov.br/receitafederal/dados/arrecadacao-estado.csv">Receita Federal, arrecadação por estado</a> ·{" "}
          <a href="https://www.tesourotransparente.gov.br/ckan/dataset/transferencias-constitucionais-para-estados">Tesouro Nacional, transferências constitucionais</a>{" "}
          · <Link href="/pacto-federativo#como-ler">como ler estes números</Link>
        </p>
      </section>

      <section className={styles.secao} aria-labelledby="emendas">
        <h2 id="emendas" className={ui.h2}>
          Emendas parlamentares destinadas {doEstado(e.uf, e.nome).replace(/^(do|da|de) /, (x) => ({ "do ": "ao ", "da ": "à ", "de ": "a " })[x] ?? x)}
        </h2>
        <p className={ui.apoio}>Todas as emendas com destino no estado (individuais, de bancada, de comissão e do relator), por ano. Valor empenhado e pago.</p>
        <ul className={styles.barras}>
          {emendas.porAno.map((a) => (
            <li key={a.ano}>
              <span className={styles.partido}>{a.ano}</span>
              <span className={styles.trilho} aria-hidden="true">
                <span className={styles.barra} style={{ width: `${(a.empenhado / maiorAno) * 100}%` }} />
              </span>
              <span className={styles.qtd}>
                {reais(a.empenhado)} · pago {reais(a.pago)}
              </span>
            </li>
          ))}
        </ul>
        <h3 className={styles.h3}>Municípios que mais receberam (empenhado, desde 2014)</h3>
        <ol className={styles.ranking}>
          {emendas.porMunicipio.map((m) => (
            <li key={m.municipio_id}>
              <Link href={`/municipio/${m.municipio_id}`}>{nomeMun.get(m.municipio_id) ?? m.municipio_id}</Link>
              <span className={styles.qtd}>
                {reais(m.empenhado)} · {numero(m.emendas)} emendas
              </span>
            </li>
          ))}
        </ol>
        <details className={styles.todos}>
          <summary>Todos os {municipios.length} municípios</summary>
          <ul>
            {municipios.map((m) => (
              <li key={m.ibge_id}>
                <Link href={`/municipio/${m.ibge_id}`}>{m.nome}</Link>
              </li>
            ))}
          </ul>
        </details>
        <p className={ui.fonte}>
          Fonte: <a href="https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares">Portal da Transparência — emendas parlamentares</a>
        </p>
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
