import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { listarParlamentares } from "@/lib/dados";
import { ESTADOS } from "@/dados/estados";
import { semAcento } from "@/lib/formato";
import styles from "./parlamentares.module.css";

export const metadata: Metadata = {
  title: "Parlamentares",
  description: "Busque deputados federais e senadores em exercício e veja como votaram e o que propuseram.",
};

const MAXIMO = 60;

async function Resultados({ searchParams }: { searchParams: PageProps<"/parlamentares">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const casa = sp.casa === "camara" || sp.casa === "senado" ? sp.casa : "";
  const uf = typeof sp.uf === "string" && /^[A-Z]{2}$/.test(sp.uf) ? sp.uf : "";

  const todos = await listarParlamentares();
  const termo = semAcento(q);
  const achados = todos.filter(
    (p) => p.ativo && (!casa || p.casa === casa) && (!uf || p.uf === uf) && (!termo || semAcento(p.nome_parlamentar).includes(termo)),
  );

  return (
    <>
      <form className={styles.filtros} role="search">
        <div className={styles.campoBusca}>
          <label htmlFor="q" className={styles.rotulo}>
            Nome
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Ex.: Maria, João…" className={styles.campo} />
        </div>
        <div>
          <label htmlFor="casa" className={styles.rotulo}>
            Casa
          </label>
          <select id="casa" name="casa" defaultValue={casa} className={styles.campo}>
            <option value="">Câmara e Senado</option>
            <option value="camara">Câmara</option>
            <option value="senado">Senado</option>
          </select>
        </div>
        <div>
          <label htmlFor="uf" className={styles.rotulo}>
            Estado
          </label>
          <select id="uf" name="uf" defaultValue={uf} className={styles.campo}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={ui.botao}>
          Buscar
        </button>
      </form>

      <p className={styles.contagem} role="status">
        {achados.length === 0
          ? `Nada encontrado${q ? ` para "${q}"` : ""}.`
          : `${achados.length} parlamentar(es) em exercício${achados.length > MAXIMO ? ` · mostrando os ${MAXIMO} primeiros` : ""}`}
      </p>

      <ul className={styles.grade}>
        {achados.slice(0, MAXIMO).map((p) => (
          <li key={p.id}>
            <Link href={`/parlamentar/${p.id}`} className={styles.item}>
              {p.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto_url} alt="" width={44} height={44} className={styles.foto} loading="lazy" />
              ) : (
                <span className={styles.foto} aria-hidden="true" />
              )}
              <span className={styles.nome}>{p.nome_parlamentar}</span>
              <span className={styles.meta}>
                {p.casa === "camara" ? "Deputado(a)" : "Senador(a)"} · {p.uf}
                {p.partido_atual ? ` · ${p.partido_atual}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Parlamentares({ searchParams }: PageProps<"/parlamentares">) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Parlamentares</h1>
        <p className={ui.apoio}>513 deputados federais e 81 senadores em exercício. Toque em um nome para ver votos e proposições.</p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ minHeight: "100svh", height: 420, marginTop: 20 }} aria-label="Carregando" />}>
          <Resultados searchParams={searchParams} />
        </Suspense>
        <p className={ui.fonte}>Fontes: Câmara dos Deputados e Senado Federal (dados abertos).</p>
      </main>
    </>
  );
}
