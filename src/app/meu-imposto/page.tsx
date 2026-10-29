import type { Metadata } from "next";
import { Topo } from "@/components/Topo";
import ui from "@/components/ui.module.css";
import { FONTES } from "@/lib/imposto";
import { Calculadora } from "./Calculadora";

export const metadata: Metadata = {
  title: "Meu imposto",
  description: "Quanto sai do seu salário para o INSS e para o imposto de renda em 2026, passo a passo, com as tabelas oficiais da Receita e do INSS.",
};

export default function MeuImposto() {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <h1 className={ui.h1}>Meu imposto</h1>
        <p className={ui.apoio}>Digite o seu salário e veja quanto vai para o INSS e para o imposto de renda em 2026, passo a passo.</p>
        <Calculadora />
        <p className={ui.fonte}>
          Tabelas oficiais: <a href={FONTES.ir}>Receita Federal, tributação de 2026</a> (incluindo a redução da Lei 15.270/2025, conferida com os{" "}
          <a href={FONTES.exemplos}>exemplos oficiais da Receita</a>) e <a href={FONTES.inss}>INSS, tabela de contribuição de 2026</a> (Portaria
          Interministerial MPS/MF nº 13/2026).
        </p>
        <p className={ui.fonte}>
          Conta de referência para salário de carteira assinada. Não inclui 13º, férias, PLR, horas extras, pensão alimentícia, previdência privada nem
          outras rendas. O valor no contracheque pode variar alguns centavos pelo arredondamento da folha de pagamento.
        </p>
      </main>
    </>
  );
}
