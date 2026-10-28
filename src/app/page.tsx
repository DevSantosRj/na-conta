import Link from "next/link";
import { MapaBrasil } from "@/components/MapaBrasil";
import styles from "./page.module.css";

const ETAPAS = [
  { n: 1, nome: "Projeto no ar num link de teste", status: "concluída" },
  { n: 2, nome: "Banco, primeiros dados e login", status: "concluída" },
  { n: 3, nome: "Perfil do parlamentar e alertas", status: "em andamento" },
  { n: 4, nome: "Mapa, estados, emendas, Constituição e Meu imposto", status: "" },
  { n: 5, nome: "Erros, segurança e velocidade", status: "" },
  { n: 6, nome: "Lançamento", status: "" },
];

const MODULOS = [
  { titulo: "Como votou", texto: "Cada votação nominal de deputados e senadores, por tema." },
  { titulo: "Proposições", texto: "Tudo o que cada parlamentar propôs, com resumo automático ao lado da ementa oficial." },
  { titulo: "Gastos e emendas", texto: "Cota parlamentar e emendas: quanto foi indicado, para qual cidade, quanto foi pago." },
  { titulo: "Pacto federativo", texto: "O que cada estado arrecada e o que recebe da União, com a regra da Constituição ao lado." },
];

function Marca() {
  return (
    <span className={styles.marca}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="7" fill="#15171A" />
        <path
          d="M8 22V10l8 12V10M20 22h5"
          stroke="#F5F4EF"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Na Conta
    </span>
  );
}

export default function Inicio() {
  return (
    <>
      <header className={styles.topo}>
        <div className={styles.conteudo}>
          <Marca />
          <span className={styles.selo}>Em construção</span>
        </div>
      </header>

      <main>
        <section className={`${styles.conteudo} ${styles.abertura}`}>
          <p className={styles.sobretitulo}>Dados abertos · 26 estados + DF · 513 deputados · 81 senadores</p>
          <h1 className={styles.titulo}>O Brasil na ponta do lápis, estado por estado.</h1>
          <p className={styles.lead}>
            Gastos, emendas, votos e impostos de quem representa você em Brasília. Cada número com a fonte
            oficial ao lado. A conclusão é sua.
          </p>
          <div className={styles.chamadas}>
            <Link href="/parlamentares" className={styles.chamada}>
              Ver como cada parlamentar votou
            </Link>
            <Link href="/alertas" className={styles.chamadaSecundaria}>
              Meus alertas
            </Link>
          </div>
        </section>

        <section className={styles.conteudo} aria-labelledby="mapa-titulo">
          <div className={styles.cartaoMapa}>
            <div className={styles.colunaMapa}>
              <h2 id="mapa-titulo" className={styles.h2}>
                Quantos deputados cada estado tem
              </h2>
              <p className={styles.apoio}>
                A Constituição distribui as cadeiras pela população, com piso de 8 e teto de 70 por estado.
              </p>
              <MapaBrasil />
            </div>
            <div className={styles.colunaPlano}>
              <h2 className={styles.h2}>O que está sendo construído</h2>
              <ol className={styles.etapas}>
                {ETAPAS.map((e) => (
                  <li key={e.n} className={styles.etapa} data-status={e.status || undefined}>
                    <span className={styles.etapaNumero}>{e.n}</span>
                    <span className={styles.etapaNome}>{e.nome}</span>
                    {e.status && <span className={styles.etapaStatus}>{e.status}</span>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className={`${styles.conteudo} ${styles.secaoModulos}`} aria-labelledby="modulos-titulo">
          <h2 id="modulos-titulo" className={styles.h2}>
            O que você vai encontrar
          </h2>
          <ul className={styles.modulos}>
            {MODULOS.map((m) => (
              <li key={m.titulo} className={styles.modulo}>
                <span className={styles.moduloTitulo}>{m.titulo}</span>
                <span className={styles.moduloTexto}>{m.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.rodape}>
        <div className={styles.conteudo}>
          <span>Na Conta · um projeto de DevSantos</span>
          <a href="https://x.com/DEVSANTOSRJ">Contato: @DEVSANTOSRJ no X</a>
          <a href="https://github.com/DevSantosRj/na-conta">Código aberto no GitHub</a>
        </div>
      </footer>
    </>
  );
}
