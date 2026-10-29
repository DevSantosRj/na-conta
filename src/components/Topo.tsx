import Link from "next/link";
import styles from "./Topo.module.css";

export function Marca() {
  return (
    <span className={styles.marca}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="7" fill="#15171A" />
        <path d="M8 22V10l8 12V10M20 22h5" stroke="#F5F4EF" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Na Conta
    </span>
  );
}

export function Topo() {
  return (
    <header className={styles.topo}>
      <div className={styles.conteudo}>
        <Link href="/" className={styles.inicio} aria-label="Na Conta — início">
          <Marca />
        </Link>
        <nav aria-label="Principal" className={styles.nav}>
          <Link href="/parlamentares">Parlamentares</Link>
          <Link href="/presidencias">Presidências</Link>
          <Link href="/meu-imposto">Meu imposto</Link>
          <Link href="/busca">Busca</Link>
          <Link href="/alertas">Meus alertas</Link>
        </nav>
      </div>
    </header>
  );
}
