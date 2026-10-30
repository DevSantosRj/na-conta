import type { Metadata } from "next";
import Link from "next/link";
import styles from "../entrar/entrar.module.css";

export const metadata: Metadata = { title: "Privacidade" };

export default function Privacidade() {
  return (
    <main className={styles.pagina}>
      <Link href="/" className={styles.voltar}>
        ← Na Conta
      </Link>
      <h1 className={styles.titulo}>Privacidade</h1>
      <p className={styles.texto}>
        Versão preliminar, em construção. O Na Conta é um projeto de DevSantos. Contato exclusivo pelo X:{" "}
        <a href="https://x.com/DEVSANTOSRJ">@DEVSANTOSRJ</a>.
      </p>
      <ul className={styles.texto}>
        <li>Para ler o site você não precisa de cadastro, e não usamos cookies de rastreamento.</li>
        <li>
          Contamos visitas com o Vercel Web Analytics, que não usa cookies nem identifica você: registra só a página aberta, o país e o tipo
          de aparelho, de forma agregada.
        </li>
        <li>
          Se você assina os alertas, guardamos apenas o seu e-mail, quem você segue e a frequência do resumo. Ninguém além
          de você vê esses dados.
        </li>
        <li>
          Para evitar abuso, cada pedido de link de acesso registra por 1 dia um código embaralhado (hash) do e-mail e da conexão, sem
          guardar o e-mail ou o endereço IP em si.
        </li>
        <li>
          As páginas que você abre ficam guardadas no seu aparelho para funcionar sem internet; as telas de login e de alertas nunca ficam.
        </li>
        <li>Você pode deixar de seguir, descadastrar pelo próprio e-mail ou apagar sua conta a qualquer momento.</li>
        <li>O estado que você escolhe no primeiro acesso fica salvo só no seu aparelho.</li>
        <li>Todos os dados de políticos vêm de fontes oficiais e abertas, com o link de origem ao lado.</li>
      </ul>
    </main>
  );
}
