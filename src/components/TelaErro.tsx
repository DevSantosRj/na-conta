import Link from "next/link";
import ui from "./ui.module.css";
import styles from "./TelaErro.module.css";

// Peça comum às telas de erro, de página não encontrada e de sem internet
export function TelaErro({
  titulo,
  texto,
  codigo,
  children,
}: {
  titulo: string;
  texto: string;
  codigo?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={styles.tela} aria-labelledby="erro-titulo">
      <h1 id="erro-titulo" className={ui.h1}>
        {titulo}
      </h1>
      <p className={styles.texto}>{texto}</p>
      <div className={styles.acoes}>
        {children}
        <Link href="/" className={ui.botaoSecundario}>
          Ir para o início
        </Link>
      </div>
      {codigo && <p className={ui.fonte}>Código para informar ao relatar o problema: {codigo}</p>}
    </section>
  );
}
