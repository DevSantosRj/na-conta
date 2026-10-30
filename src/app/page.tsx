import Link from "next/link";
import { MapaBrasil } from "@/components/MapaBrasil";
import styles from "./page.module.css";

// Situação de cada etapa do plano (atualizada à mão a cada etapa concluída)
const ETAPAS = [
  { n: 1, nome: "Projeto no ar", status: "concluída", feito: "Site publicado, código aberto e proteção contra vazamento de chaves." },
  { n: 2, nome: "Banco, dados e login", status: "concluída", feito: "Robôs da Câmara e do Senado toda madrugada; login por link no e-mail." },
  {
    n: 3,
    nome: "Parlamentares e alertas",
    status: "concluída",
    feito: "Perfis com votos, projetos, gastos, emendas e carreira; seguir parlamentares; cartão para compartilhar.",
  },
  {
    n: 4,
    nome: "Estados, cidades e ferramentas",
    status: "concluída",
    feito: "Mapa, estados, municípios, pacto federativo, presidências, busca, comparador e Meu imposto.",
  },
  {
    n: 5,
    nome: "Erros, segurança e velocidade",
    status: "concluída",
    feito: "Funciona sem internet, regras de acesso revisadas, nota acima de 90 no teste de velocidade do Google.",
  },
  { n: 6, nome: "Lançamento", status: "em andamento", feito: "Contador de visitas sem cookies e plano para voltar atrás em menos de 1 minuto." },
];

// O que ainda falta antes de abrir para todo mundo
const FALTA = [
  "Alertas por e-mail de quem você segue",
  "Resumo simples de cada projeto de lei, ao lado da ementa oficial",
  "Constituição explicada, revisada por advogado",
  "Histórico de ex-parlamentares",
  "Endereço próprio (domínio)",
  "Teste fechado com cerca de 20 pessoas",
];

const MODULOS = [
  { titulo: "Como votou", texto: "Cada votação nominal de deputados (desde 2003) e senadores (desde 1991)." },
  { titulo: "Presidências", texto: "Quem preside a República, a Câmara e o Senado hoje, todos os anteriores e como funciona o presidencialismo." },
  { titulo: "Proposições", texto: "Tudo o que cada parlamentar propôs, com a ementa oficial. Em breve, um resumo simples ao lado." },
  { titulo: "Gastos e emendas", texto: "Cota parlamentar e emendas: quanto foi indicado, para qual cidade, quanto foi pago." },
  { titulo: "Meu imposto", texto: "Quanto sai do seu salário para o INSS e para o imposto de renda, passo a passo, com as tabelas oficiais." },
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
            <Link href="/pacto-federativo" className={styles.chamadaSecundaria}>
              Pacto federativo
            </Link>
            <Link href="/presidencias" className={styles.chamadaSecundaria}>
              Presidências
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
                A Constituição distribui as cadeiras pela população, com piso de 8 e teto de 70 por estado. Toque em um estado para ver a bancada.
              </p>
              <MapaBrasil />
            </div>
            <div className={styles.colunaPlano}>
              <h2 className={styles.h2}>O que está sendo construído</h2>
              <ol className={styles.etapas}>
                {ETAPAS.map((e) => (
                  <li key={e.n} className={styles.etapa} data-status={e.status || undefined}>
                    <span className={styles.etapaNumero}>{e.n}</span>
                    <span className={styles.etapaNome}>
                      {e.nome}
                      <span className={styles.etapaFeito}>{e.feito}</span>
                    </span>
                    {e.status && <span className={styles.etapaStatus}>{e.status}</span>}
                  </li>
                ))}
              </ol>
              <h3 className={styles.h3Falta}>Falta para o lançamento</h3>
              <ul className={styles.falta}>
                {FALTA.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
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
    </>
  );
}
