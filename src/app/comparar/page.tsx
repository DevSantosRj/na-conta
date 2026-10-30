import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { buscarParlamentar, concordancia, emendasDoParlamentar, gastosDoParlamentar, listarParlamentares, mandatos, resumoVotos } from "@/lib/dados";
import { CASA, numero, reais } from "@/lib/formato";
import styles from "./comparar.module.css";

export const metadata: Metadata = {
  title: "Comparar parlamentares",
  description: "Compare dois deputados ou senadores lado a lado: votos, em quantas votações concordaram, proposições, gastos e emendas.",
};

const valido = (s: unknown) => (typeof s === "string" && /^[CS]-\d+$/.test(s) ? s : null);

async function Ficha(id: string) {
  const p = await buscarParlamentar(id);
  if (!p) return null;
  const outra = p.outra_casa_id ? await buscarParlamentar(p.outra_casa_id) : null;
  const ids = [p.id, outra?.id].filter(Boolean).sort() as string[];
  const [resumo, mand, gastos, emendas] = await Promise.all([resumoVotos(ids), mandatos(ids), gastosDoParlamentar(ids), emendasDoParlamentar(ids)]);
  await connection();
  const ano = new Date().getFullYear() - 1;
  const gastoAno = gastos.filter((g) => g.ano === ano).reduce((s, g) => s + g.valor, 0);
  return {
    p,
    ids,
    linhas: [
      ["Cargo", `${CASA[p.casa].cargo} · ${p.uf}${p.partido_atual ? ` · ${p.partido_atual}` : ""}`],
      ["Mandatos (Câmara e Senado)", numero(mand.length)],
      ["Votações registradas", numero(resumo.total)],
      ["Votou Sim", resumo.total ? `${numero(resumo.porTipo.sim)} (${Math.round((resumo.porTipo.sim / resumo.total) * 100)}%)` : "—"],
      ["Votou Não", resumo.total ? `${numero(resumo.porTipo.nao)} (${Math.round((resumo.porTipo.nao / resumo.total) * 100)}%)` : "—"],
      ["Proposições como autor", numero(resumo.proposicoes)],
      [`Cota parlamentar em ${ano}`, gastoAno ? reais(gastoAno) : "—"],
      ["Emendas empenhadas (desde 2014)", reais(emendas.reduce((s, e) => s + e.valor_empenhado, 0))],
    ] as [string, string][],
  };
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/comparar">["searchParams"] }) {
  const sp = await searchParams;
  const a = valido(sp.a);
  const b = valido(sp.b);
  const todos = (await listarParlamentares()).filter((p) => p.ativo).sort((x, y) => x.nome_parlamentar.localeCompare(y.nome_parlamentar, "pt-BR"));
  const opcoes = todos.map((p) => (
    <option key={p.id} value={p.id}>
      {p.nome_parlamentar} ({p.casa === "camara" ? "dep." : "sen."} {p.uf})
    </option>
  ));
  const formulario = (
    <form className={styles.form}>
      <label>
        <span>Primeiro parlamentar</span>
        <select name="a" defaultValue={a ?? ""} required>
          <option value="">Escolha…</option>
          {opcoes}
        </select>
      </label>
      <label>
        <span>Segundo parlamentar</span>
        <select name="b" defaultValue={b ?? ""} required>
          <option value="">Escolha…</option>
          {opcoes}
        </select>
      </label>
      <button type="submit" className={ui.botao}>
        Comparar
      </button>
    </form>
  );
  if (!a || !b || a === b) return formulario;

  const [fa, fb] = await Promise.all([Ficha(a), Ficha(b)]);
  if (!fa || !fb) return formulario;
  const juntos = await concordancia(fa.ids, fb.ids);

  return (
    <>
      {formulario}
      <section className={`${ui.cartao} ${styles.destaque}`}>
        {juntos.comuns ? (
          <p>
            Nas <strong>{numero(juntos.comuns)}</strong> votações em que os dois votaram Sim ou Não, votaram igual em{" "}
            <strong>{numero(juntos.iguais)}</strong> ({Math.round((juntos.iguais / juntos.comuns) * 100)}%).
          </p>
        ) : (
          <p>Os dois não têm votações nominais em comum registradas (por exemplo, quando são de Casas diferentes).</p>
        )}
      </section>
      <div className={styles.tabelaRolagem}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Item</span>
              </th>
              <th scope="col">
                <Link href={`/parlamentar/${fa.p.id}`}>{fa.p.nome_parlamentar}</Link>
              </th>
              <th scope="col">
                <Link href={`/parlamentar/${fb.p.id}`}>{fb.p.nome_parlamentar}</Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {fa.linhas.map(([rotulo, va], i) => (
              <tr key={rotulo}>
                <th scope="row">{rotulo}</th>
                <td>{va}</td>
                <td>{fb.linhas[i][1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={ui.fonte}>
        Votos, proposições e mandatos: dados abertos da Câmara e do Senado. Cota parlamentar: arquivos CEAP/CEAPS. Emendas: Portal da Transparência. A
        concordância conta só votações nominais em que os dois votaram Sim ou Não. Números brutos, sem juízo de valor: veja a{" "}
        <Link href="/metodologia">metodologia</Link>.
      </p>
    </>
  );
}

export default function Comparar(props: PageProps<"/comparar">) {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Comparar parlamentares</h1>
        <p className={ui.apoio}>Escolha dois deputados ou senadores em exercício e veja os números lado a lado.</p>
        <Suspense fallback={<div className={ui.esqueleto} style={{ minHeight: "100svh", height: 420, marginTop: 20 }} aria-label="Carregando" />}>
          <Conteudo searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
