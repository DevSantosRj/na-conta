import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { presidencias, type Presidencia } from "@/lib/dados";
import { data } from "@/lib/formato";
import styles from "./presidencias.module.css";

export const metadata: Metadata = {
  title: "Presidências",
  description:
    "Quem preside a República, a Câmara e o Senado hoje, quem presidiu antes e como funciona o presidencialismo brasileiro — com a fonte oficial de cada dado.",
};

const CF = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";

const CARGOS = {
  republica: { aba: "República", titulo: "Presidência da República", atual: "Presidente da República" },
  camara: { aba: "Câmara", titulo: "Presidência da Câmara dos Deputados", atual: "Presidente da Câmara" },
  senado: { aba: "Senado", titulo: "Presidência do Senado Federal", atual: "Presidente do Senado" },
} as const;
type Cargo = keyof typeof CARGOS;

// Conferido em 28/10/2026. Vice e STF não são cargos do Legislativo: ficam aqui só para a linha de sucessão.
const SUCESSAO = [
  { cargo: "Vice-presidente da República", nome: "Geraldo Alckmin", fonte: "https://www.gov.br/planalto/pt-br/vice-presidencia" },
  { cargo: "Presidente da Câmara dos Deputados", ref: "camara" as Cargo },
  { cargo: "Presidente do Senado Federal", ref: "senado" as Cargo },
  { cargo: "Presidente do Supremo Tribunal Federal", nome: "Edson Fachin", fonte: "https://noticias.stf.jus.br/postsnoticias/ministro-edson-fachin-e-eleito-presidente-do-stf/" },
];

function periodoDe(p: Presidencia) {
  const ini = p.inicio ? data(p.inicio) : String(p.ano_inicio);
  if (!p.inicio && !p.ano_fim && p.observacao?.includes("não tomou posse")) return String(p.ano_inicio);
  const fim = p.fim ? data(p.fim) : p.ano_fim ? String(p.ano_fim) : "hoje";
  return ini === fim ? ini : `${ini} – ${fim}`;
}

function NomeComPerfil({ p }: { p: Presidencia }) {
  return p.parlamentar_id ? <Link href={`/parlamentar/${p.parlamentar_id}`}>{p.nome}</Link> : <>{p.nome}</>;
}

function Atual({ p, rotulo }: { p: Presidencia; rotulo: string }) {
  return (
    <div className={`${ui.cartao} ${styles.atual}`}>
      <p className={ui.rotuloPequeno}>{rotulo}</p>
      <p className={styles.nomeAtual}>
        <NomeComPerfil p={p} />
      </p>
      <p className={ui.apoio}>
        {[p.partido && p.uf ? `${p.partido}-${p.uf}` : p.partido, `desde ${p.inicio ? data(p.inicio) : p.ano_inicio}`].filter(Boolean).join(" · ")}
      </p>
      {p.observacao && <p className={styles.obs}>{p.observacao}</p>}
      <p className={ui.fonte}>
        <a href={p.fonte_url}>fonte oficial</a>
      </p>
    </div>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/presidencias">["searchParams"] }) {
  const sp = await searchParams;
  const aba: Cargo = sp.cargo === "camara" || sp.cargo === "senado" ? sp.cargo : "republica";
  const todas = await presidencias();
  const atual = (c: Cargo) => todas.find((p) => p.cargo === c && !p.ano_fim && !p.observacao?.includes("não tomou posse"));

  const lista = todas.filter((p) => p.cargo === aba);
  const grupos = new Map<string, Presidencia[]>();
  for (const p of lista) grupos.set(p.periodo, [...(grupos.get(p.periodo) ?? []), p]);
  const fontes = [...new Set(lista.map((p) => p.fonte_url))];

  return (
    <>
      <section aria-labelledby="hoje" className={styles.secao}>
        <h2 id="hoje" className={ui.h2}>
          Quem preside hoje
        </h2>
        <div className={styles.atuais}>
          {(Object.keys(CARGOS) as Cargo[]).map((c) => {
            const p = atual(c);
            return p ? <Atual key={c} p={p} rotulo={CARGOS[c].atual} /> : null;
          })}
        </div>
      </section>

      <section aria-labelledby="como" className={`${ui.cartao} ${styles.secao}`}>
        <h2 id="como" className={ui.h2}>
          Como funciona o presidencialismo no Brasil
        </h2>
        <ul className={styles.fatos}>
          <li>
            O presidente da República chefia ao mesmo tempo o Estado e o governo, com a ajuda dos ministros (<a href={`${CF}#art76`}>art. 76</a>).
          </li>
          <li>
            É eleito pelo voto direto, com maioria absoluta dos votos válidos, em até dois turnos (<a href={`${CF}#art77`}>art. 77</a>).
          </li>
          <li>
            O mandato é de 4 anos, com uma reeleição seguida permitida (<a href={`${CF}#art14`}>art. 14, § 5º</a> e{" "}
            <a href={`${CF}#art82`}>art. 82</a>). A partir de 2027, a posse é em 5 de janeiro (Emenda Constitucional 111/2021).
          </li>
          <li>
            O Congresso (Câmara e Senado) faz as leis e fiscaliza o governo; cada Casa elege o seu presidente para mandatos de 2 anos (
            <a href={`${CF}#art57`}>art. 57, § 4º</a>).
          </li>
          <li>
            O sistema foi confirmado em plebiscito em 1993, quando os eleitores escolheram a república presidencialista em vez do parlamentarismo ou da
            monarquia (<a href="https://www.planalto.gov.br/ccivil_03/constituicao/adct.htm">ADCT, art. 2º</a>).
          </li>
        </ul>
        <h3 className={styles.h3}>Linha de sucessão (art. 80)</h3>
        <p className={ui.apoio}>Se o presidente não puder exercer o cargo, assume, nesta ordem:</p>
        <ol className={styles.sucessao}>
          {SUCESSAO.map((s) => {
            const p = s.ref ? atual(s.ref) : null;
            return (
              <li key={s.cargo}>
                <span>{s.cargo}</span>
                <strong>{p ? <NomeComPerfil p={p} /> : s.nome}</strong>
                {!p && s.fonte && (
                  <a href={s.fonte} className={styles.fonteMini}>
                    fonte
                  </a>
                )}
              </li>
            );
          })}
        </ol>
        <p className={ui.fonte}>
          Resumo em linguagem simples · texto oficial: <a href={CF}>Constituição Federal</a> · conferido em 28/10/2026
        </p>
      </section>

      <nav aria-label="Histórico por cargo" className={styles.abas}>
        {(Object.keys(CARGOS) as Cargo[]).map((c) => (
          <Link key={c} href={`/presidencias?cargo=${c}`} className={styles.aba} aria-current={aba === c ? "page" : undefined} scroll={false}>
            {CARGOS[c].aba}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="historico">
        <h2 id="historico" className={ui.h2}>
          {CARGOS[aba].titulo}: todos os presidentes
        </h2>
        <p className={ui.apoio}>{lista.length} registros, do mais recente ao mais antigo. Quem tem perfil no Na Conta aparece com link.</p>
        {[...grupos.entries()].map(([periodo, ps]) => {
          const corpo = (
            <ol className={styles.linhaTempo}>
              {ps.map((p) => (
                <li key={p.ordem}>
                  <span className={styles.quando}>{periodoDe(p)}</span>
                  <span className={styles.quem}>
                    <NomeComPerfil p={p} />
                    {(p.partido || p.uf) && <span className={styles.partido}> · {[p.partido, p.uf].filter(Boolean).join("-")}</span>}
                    {p.observacao && <span className={styles.obs}>{p.observacao}</span>}
                  </span>
                </li>
              ))}
            </ol>
          );
          return periodo.startsWith("Império") ? (
            <details key={periodo} className={styles.grupo}>
              <summary className={styles.h3}>
                {periodo} · {ps.length}
              </summary>
              {corpo}
            </details>
          ) : (
            <div key={periodo} className={styles.grupo}>
              <h3 className={styles.h3}>
                {periodo} · {ps.length}
              </h3>
              {aba === "senado" && (periodo.startsWith("Primeira") || periodo.startsWith("República de 1946")) && (
                <p className={styles.obs}>Pelas Constituições de 1891 e de 1946, o vice-presidente da República era também o presidente do Senado.</p>
              )}
              {corpo}
            </div>
          );
        })}
        <p className={ui.fonte}>
          Fontes oficiais:{" "}
          {fontes.map((f, i) => (
            <span key={f}>
              {i > 0 && " · "}
              <a href={f}>{new URL(f).hostname.replace("www.", "").replace("www2.", "").replace("www25.", "")}</a>
            </span>
          ))}
          {aba === "republica" && " (só nomes e datas)"}
        </p>
      </section>
    </>
  );
}

export default function Presidencias(props: PageProps<"/presidencias">) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Presidências</h1>
        <p className={ui.apoio}>Quem preside a República, a Câmara e o Senado — hoje e desde o início — com a fonte oficial ao lado.</p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ minHeight: "100svh", height: 640, marginTop: 24 }} aria-label="Carregando" />}>
          <Conteudo searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
