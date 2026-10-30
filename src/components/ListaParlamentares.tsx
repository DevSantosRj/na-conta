import Image from "next/image";
import Link from "next/link";
import type { Parlamentar } from "@/lib/dados";
import styles from "@/app/parlamentares/parlamentares.module.css";

type Item = Pick<Parlamentar, "id" | "casa" | "nome_parlamentar" | "uf" | "partido_atual" | "foto_url">;

export function ListaParlamentares({ itens }: { itens: Item[] }) {
  return (
    <ul className={styles.grade}>
      {itens.map((p) => (
        <li key={p.id}>
          <Link href={`/parlamentar/${p.id}`} className={styles.item}>
            {p.foto_url ? (
                            <Image src={p.foto_url} alt="" width={44} height={44} className={styles.foto} />
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
  );
}
