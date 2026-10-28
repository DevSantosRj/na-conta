import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Formulario } from "./Formulario";
import styles from "./entrar.module.css";

export const metadata: Metadata = { title: "Entrar" };

// Só aceita caminhos internos (ex.: /parlamentar/C-123) como destino depois do login.
function destinoSeguro(valor: unknown) {
  return typeof valor === "string" && valor.startsWith("/") && !valor.startsWith("//") ? valor : "/alertas";
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { erro, proximo } = await searchParams;
  return (
    <>
      {erro === "link" && (
        <p className={styles.erro} role="alert">
          Esse link expirou ou já foi usado. Peça outro abaixo.
        </p>
      )}
      <Formulario proximo={destinoSeguro(proximo)} />
    </>
  );
}

export default function Entrar({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className={styles.pagina}>
      <Link href="/" className={styles.voltar}>
        ← Na Conta
      </Link>
      <h1 className={styles.titulo}>Receba alertas de votação</h1>
      <p className={styles.texto}>
        Sem senha: digite seu e-mail e enviamos um link de acesso. Você escolhe depois se quer o resumo diário ou semanal.
      </p>
      <Suspense fallback={<div className={styles.form} style={{ minHeight: 240 }} />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
