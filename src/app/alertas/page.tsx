import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { mudarFrequencia, sair } from "./acoes";
import styles from "../entrar/entrar.module.css";
import proprio from "./alertas.module.css";

export const metadata: Metadata = { title: "Meus alertas", robots: { index: false } };

async function MinhaConta() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: perfil } = await supabase.from("perfis").select("frequencia").eq("user_id", user.id).single();
  const { count } = await supabase.from("seguindo").select("parlamentar_id", { count: "exact", head: true });

  return (
    <>
      <p className={styles.texto}>
        Conectado como <strong>{user.email}</strong>.
      </p>

      <section className={styles.form} aria-labelledby="freq">
        <h2 id="freq" className={proprio.h2}>
          Frequência do e-mail
        </h2>
        <form action={mudarFrequencia} className={proprio.opcoes}>
          {(["diario", "semanal"] as const).map((f) => (
            <button
              key={f}
              type="submit"
              name="frequencia"
              value={f}
              className={proprio.opcao}
              aria-pressed={perfil?.frequencia === f}
            >
              {f === "diario" ? "Resumo diário" : "Resumo semanal"}
            </button>
          ))}
        </form>
        <p className={proprio.nota}>Só chega e-mail nos dias em que alguém que você segue votou.</p>
      </section>

      <section className={`${styles.form} ${proprio.secao}`} aria-labelledby="seguindo">
        <h2 id="seguindo" className={proprio.h2}>
          Quem você segue
        </h2>
        {count ? (
          <p className={styles.texto}>{count} parlamentar(es).</p>
        ) : (
          <p className={styles.texto}>Você ainda não segue ninguém. As páginas de cada parlamentar chegam na próxima etapa.</p>
        )}
      </section>

      <form action={sair} className={proprio.secao}>
        <button type="submit" className={proprio.secundario}>
          Sair
        </button>
      </form>
    </>
  );
}

export default function Alertas() {
  return (
    <main className={styles.pagina}>
      <Link href="/" className={styles.voltar}>
        ← Na Conta
      </Link>
      <h1 className={styles.titulo}>Meus alertas</h1>
      <Suspense fallback={<div className={proprio.esqueleto} aria-label="Carregando" />}>
        <MinhaConta />
      </Suspense>
    </main>
  );
}
