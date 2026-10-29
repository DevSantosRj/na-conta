import Link from "next/link";
import type { LinhaEmenda } from "@/lib/dados";
import { categoriaLegivel, nomeProprio, numero, reais } from "@/lib/formato";
import ui from "./ui.module.css";
import styles from "./ResumoEmendas.module.css";

type Grupo = { chave: string; rotulo: string; href?: string; empenhado: number; pago: number; emendas: number };

function agrupar(linhas: LinhaEmenda[], chave: (l: LinhaEmenda) => { chave: string; rotulo: string; href?: string } | null) {
  const m = new Map<string, Grupo>();
  for (const l of linhas) {
    const k = chave(l);
    if (!k) continue;
    const g = m.get(k.chave) ?? { ...k, empenhado: 0, pago: 0, emendas: 0 };
    g.empenhado += l.valor_empenhado;
    g.pago += l.valor_pago + l.valor_rap_pago;
    g.emendas++;
    m.set(k.chave, g);
  }
  return [...m.values()].sort((a, b) => b.empenhado - a.empenhado);
}

function Barras({ grupos, limite = 12 }: { grupos: Grupo[]; limite?: number }) {
  const maior = Math.max(...grupos.map((g) => g.empenhado), 1);
  return (
    <ul className={styles.barras}>
      {grupos.slice(0, limite).map((g) => (
        <li key={g.chave}>
          <span className={styles.rotulo}>{g.href ? <Link href={g.href}>{g.rotulo}</Link> : g.rotulo}</span>
          <span className={styles.trilho} aria-hidden="true">
            <span className={styles.empenhado} style={{ width: `${(g.empenhado / maior) * 100}%` }} />
            <span className={styles.pago} style={{ width: `${(Math.min(g.pago, g.empenhado) / maior) * 100}%` }} />
          </span>
          <span className={styles.valor}>
            {reais(g.empenhado)}
            <small>pago {reais(g.pago)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Visão de quem indicou (perfil do parlamentar) ou de quem recebeu (município)
export function ResumoEmendas({
  linhas,
  modo,
  nomes = {},
}: {
  linhas: LinhaEmenda[];
  modo: "autor" | "destino";
  nomes?: Record<number, string>;
}) {
  if (!linhas.length) return <p className={ui.vazio}>Nenhuma emenda encontrada no arquivo do Portal da Transparência.</p>;
  const totalEmp = linhas.reduce((s, l) => s + l.valor_empenhado, 0);
  const totalPago = linhas.reduce((s, l) => s + l.valor_pago + l.valor_rap_pago, 0);
  const porAno = agrupar(linhas, (l) => ({ chave: String(l.ano), rotulo: String(l.ano) })).sort((a, b) => Number(b.chave) - Number(a.chave));
  const porArea = agrupar(linhas, (l) => (l.funcao ? { chave: l.funcao, rotulo: categoriaLegivel(l.funcao) } : null));
  const porDestino =
    modo === "autor"
      ? agrupar(linhas, (l) =>
          l.municipio_id
            ? { chave: `m${l.municipio_id}`, rotulo: `${nomes[l.municipio_id] ?? l.localidade ?? l.municipio_id} (${l.uf ?? ""})`, href: `/municipio/${l.municipio_id}` }
            : { chave: `l${l.localidade}`, rotulo: categoriaLegivel(l.localidade ?? "Sem localidade") },
        )
      : agrupar(linhas, (l) => ({
          chave: l.autor ?? "Sem autor informado",
          rotulo: l.autor ? nomeProprio(l.autor) : "Sem autor informado",
          href: l.parlamentar_id ? `/parlamentar/${l.parlamentar_id}?aba=emendas` : undefined,
        }));

  return (
    <>
      <dl className={styles.numeros}>
        <div className={ui.cartao}>
          <dt>Emendas</dt>
          <dd>{numero(linhas.length)}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>Valor empenhado</dt>
          <dd>{reais(totalEmp)}</dd>
        </div>
        <div className={ui.cartao}>
          <dt>Valor pago</dt>
          <dd>{reais(totalPago)}</dd>
        </div>
      </dl>
      <p className={styles.legenda}>
        <span className={styles.amostraEmp} /> empenhado (dinheiro reservado no Orçamento) <span className={styles.amostraPago} /> pago (inclui restos a
        pagar pagos nos anos seguintes)
      </p>

      <section className={`${ui.cartao} ${styles.bloco}`}>
        <h2 className={ui.h2}>Por ano</h2>
        <Barras grupos={porAno} limite={20} />
      </section>
      <section className={`${ui.cartao} ${styles.bloco}`}>
        <h2 className={ui.h2}>{modo === "autor" ? "Para onde foram" : "Quem indicou"}</h2>
        <p className={ui.apoio}>
          {modo === "autor"
            ? "Os 12 destinos com mais dinheiro empenhado. Toque em uma cidade para ver tudo o que ela recebeu."
            : "Os 12 autores com mais dinheiro empenhado. Bancadas, comissões e o relator do Orçamento também indicam emendas."}
        </p>
        <Barras grupos={porDestino} />
      </section>
      <section className={`${ui.cartao} ${styles.bloco}`}>
        <h2 className={ui.h2}>Por área</h2>
        <Barras grupos={porArea} />
      </section>
      <p className={ui.fonte}>
        Fonte: <a href={linhas[0].fonte_url}>Portal da Transparência — emendas parlamentares</a> (arquivo oficial com todos os anos desde 2014).
      </p>
    </>
  );
}
