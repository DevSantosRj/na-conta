import type { Metadata } from "next";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import styles from "./metodologia.module.css";

export const metadata: Metadata = {
  title: "Metodologia e fontes",
  description: "De onde vem cada número do Na Conta, desde quando há dados, como as informações são ligadas e como pedir uma correção.",
};

const FONTES: [string, string, string, string][] = [
  ["Votações e votos (Câmara)", "Câmara dos Deputados — dados abertos (arquivos anuais)", "https://dadosabertos.camara.leg.br", "voto individual desde 2001 (na prática, 2003)"],
  ["Votações e votos (Senado)", "Senado Federal — dados abertos (serviço /votacao)", "https://legis.senado.leg.br/dadosabertos", "desde 1991; votações secretas não têm voto individual"],
  ["Proposições e autoria (Câmara)", "Câmara dos Deputados — arquivos de proposições e autores", "https://dadosabertos.camara.leg.br", "projetos de quem está no mandato hoje, desde 1987"],
  ["Proposições e autoria (Senado)", "Senado Federal — serviço /processo", "https://legis.senado.leg.br/dadosabertos", "carreira inteira no Senado"],
  ["Cota parlamentar", "Câmara (CEAP) e Senado (CEAPS) — arquivos anuais", "https://www.camara.leg.br/transparencia/gastos-parlamentares", "desde 2008"],
  ["Emendas parlamentares", "Portal da Transparência (CGU) — download em lote", "https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares", "desde 2014"],
  ["População", "IBGE — SIDRA, tabela 6579 (estimativas)", "https://sidra.ibge.gov.br/tabela/6579", "estimativa mais recente"],
  ["Arrecadação federal por estado", "Receita Federal — arrecadação por estado (arquivo mensal)", "https://www.gov.br/receitafederal/dados/arrecadacao-estado.csv", "desde 2000; pacto federativo a partir de 2019"],
  ["Repasses constitucionais", "Tesouro Nacional — transferências a estados e municípios (arquivos mensais)", "https://www.tesourotransparente.gov.br/ckan/dataset/transferencias-constitucionais-para-estados", "desde 2019; alguns meses não foram publicados"],
  ["Partido em mandatos anteriores", "Câmara (histórico do deputado) e Senado (filiações)", "https://dadosabertos.camara.leg.br", "quando mudou de partido na legislatura, mostra a sequência"],
  ["Presidências", "Arquivo Nacional, Câmara e Senado — listas oficiais", "/presidencias", "República desde 1889; Câmara e Senado desde 1826"],
  ["Meu imposto", "Receita Federal e INSS — tabelas oficiais de 2026", "/meu-imposto", "conferido com os exemplos oficiais da Receita"],
];

export default function Metodologia() {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Metodologia e fontes</h1>
        <p className={ui.apoio}>O Na Conta mostra o dado e a fonte. A conclusão é de quem lê.</p>

        <section className={styles.secao}>
          <h2 className={ui.h2}>De onde vem cada número</h2>
          <div className={styles.rolagem}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th>Dado</th>
                  <th>Fonte oficial</th>
                  <th>Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {FONTES.map(([dado, fonte, link, cobertura]) => (
                  <tr key={dado}>
                    <th scope="row">{dado}</th>
                    <td>{link.startsWith("/") ? <Link href={link}>{fonte}</Link> : <a href={link}>{fonte}</a>}</td>
                    <td>{cobertura}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={ui.apoio}>
            Os robôs de coleta rodam toda madrugada (03:17, horário de Brasília) e o código deles é aberto no{" "}
            <a href="https://github.com/DevSantosRj/na-conta/tree/main/scripts/coleta">GitHub</a>. Cada execução fica registrada.
          </p>
        </section>

        <section className={styles.secao}>
          <h2 className={ui.h2}>Regras que seguimos</h2>
          <ul className={styles.regras}>
            <li>
              <strong>Neutralidade.</strong> Nenhum texto do site elogia ou critica parlamentar, partido ou governo. Comparações são de números, com a fonte ao
              lado.
            </li>
            <li>
              <strong>Placar conferido.</strong> Toda madrugada, o placar das votações da Câmara gravado aqui é comparado com o placar oficial. Quando a fonte
              publica o placar mas não o voto de cada um, a página da votação avisa.
            </li>
            <li>
              <strong>Carreira nas duas Casas.</strong> A ficha da Câmara e a do Senado só são ligadas quando nome civil completo e data de nascimento são
              iguais nas duas fontes oficiais.
            </li>
            <li>
              <strong>Autoria de emendas.</strong> O Portal da Transparência publica o nome do autor. A emenda só aparece no perfil quando esse nome
              corresponde a um único parlamentar; emendas de bancada, de comissão e do relator ficam nas páginas de estado e município.
            </li>
            <li>
              <strong>Proposição de uma votação.</strong> Quando a descrição da votação cita um projeto, a votação é ligada a esse projeto; se ele não estiver
              no banco, a votação fica sem vínculo em vez de ganhar um vínculo errado.
            </li>
            <li>
              <strong>Gastos.</strong> Guardamos a soma por mês e categoria (por ano até 2022). Cada nota fiscal está no arquivo oficial indicado na página.
            </li>
            <li>
              <strong>Pacto federativo.</strong> A arrecadação é a soma de todos os tributos federais que a Receita atribui ao estado (pelo domicílio de quem
              paga). Os repasses são as transferências constitucionais da União ao governo do estado e às prefeituras; a parte do FUNDEB formada por impostos
              do próprio estado (ICMS, IPVA, ITCMD) e a linha &quot;DEDU&quot;, cuja origem o arquivo não identifica, ficam fora. Alguns arquivos do Tesouro vêm
              em centavos e são convertidos para reais; meses que o Tesouro não publicou aparecem como ano incompleto.
            </li>
            <li>
              <strong>Resumo automático.</strong> Quando houver resumo de projeto gerado por inteligência artificial, ele aparece marcado como &quot;Resumo
              automático&quot; e sempre com a ementa oficial ao lado.
            </li>
            <li>
              <strong>Constituição.</strong> Explicações em linguagem simples só vão ao ar depois de revisadas por advogado, com nome e data da revisão.
            </li>
            <li>
              <strong>Dados pessoais.</strong> O CPF que algumas fontes publicam nunca é lido nem guardado. Veja a <Link href="/privacidade">privacidade</Link>.
            </li>
          </ul>
        </section>

        <section className={styles.secao}>
          <h2 className={ui.h2}>Achou um erro?</h2>
          <p className={ui.apoio}>
            Mande o link da página e o que está diferente da fonte oficial para <a href="https://x.com/DEVSANTOSRJ">@DEVSANTOSRJ no X</a>. Correções
            confirmadas entram na próxima atualização.
          </p>
        </section>
      </main>
    </>
  );
}
