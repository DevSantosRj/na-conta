import Link from "next/link";
import styles from "./Rodape.module.css";

export function Rodape() {
  return (
    <footer className={styles.rodape}>
      <div className={styles.conteudo}>
        <nav aria-label="Mais páginas" className={styles.links}>
          <Link href="/busca">Busca</Link>
          <Link href="/comparar">Comparar parlamentares</Link>
          <Link href="/pacto-federativo">Pacto federativo</Link>
          <Link href="/constituicao">Constituição</Link>
          <Link href="/metodologia">Metodologia e fontes</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>
        <p>
          Na Conta · um projeto de DevSantos · <a href="https://x.com/DEVSANTOSRJ">contato: @DEVSANTOSRJ no X</a> ·{" "}
          <a href="https://github.com/DevSantosRj/na-conta">código aberto no GitHub</a>
        </p>
      </div>
    </footer>
  );
}
