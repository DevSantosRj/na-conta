import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Formulario } from "./Formulario";
import styles from "./entrar.module.css";

export const metadata: Metadata = { title: "Entrar" };

async function AvisoLinkExpirado({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { erro } = await searchParams;
  if (erro !== "link") return null;
  return (
    <p className={styles.erro} role="alert">
      Esse link expirou ou já foi usado. Peça outro abaixo.
    </p>
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
      <Suspense fallback={null}>
        <AvisoLinkExpirado searchParams={searchParams} />
      </Suspense>
      <Formulario />
    </main>
  );
}
