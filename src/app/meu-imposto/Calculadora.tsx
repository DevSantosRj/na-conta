"use client";

import { useMemo, useState } from "react";
import { calcular, DEDUCAO_DEPENDENTE, DESCONTO_SIMPLIFICADO } from "@/lib/imposto";
import styles from "./imposto.module.css";

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// "5.000,00" ou "5000" ou "5000.5" → número
function lerValor(texto: string) {
  const limpo = texto.replace(/[^\d,.]/g, "");
  const n = limpo.includes(",") ? Number(limpo.replace(/\./g, "").replace(",", ".")) : Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function Calculadora() {
  const [salario, setSalario] = useState("5.000,00");
  const [dependentes, setDependentes] = useState(0);
  const bruto = lerValor(salario);
  const r = useMemo(() => calcular(bruto, dependentes), [bruto, dependentes]);

  return (
    <div className={styles.calc}>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <label className={styles.campo}>
          <span>Salário bruto mensal (carteira assinada)</span>
          <span className={styles.entrada}>
            <span aria-hidden="true">R$</span>
            <input inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} aria-describedby="dica-salario" />
          </span>
          <small id="dica-salario">O valor que aparece como &quot;salário&quot; no contracheque, antes dos descontos.</small>
        </label>
        <label className={styles.campo}>
          <span>Dependentes para o IR</span>
          <select value={dependentes} onChange={(e) => setDependentes(Number(e.target.value))}>
            {Array.from({ length: 7 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      </form>

      {bruto > 0 && (
        <section aria-live="polite">
          <dl className={styles.resumo}>
            <div>
              <dt>INSS</dt>
              <dd>{reais(r.inss.total)}</dd>
            </div>
            <div>
              <dt>Imposto de renda</dt>
              <dd>{reais(r.ir.imposto)}</dd>
            </div>
            <div className={styles.liquido}>
              <dt>Salário líquido</dt>
              <dd>{reais(r.liquido)}</dd>
            </div>
          </dl>
          <p className={styles.frase}>
            Do salário bruto de {reais(bruto)}, {pct(r.inss.total / bruto)} vão para o INSS e {pct(r.ir.imposto / bruto)} para o imposto de renda.
          </p>

          <details className={styles.passo} open>
            <summary>Como o INSS foi calculado</summary>
            <p>A alíquota é progressiva: cada faixa do salário paga a sua porcentagem.</p>
            <table>
              <thead>
                <tr>
                  <th>Faixa do salário</th>
                  <th>Alíquota</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.inss.faixas.map((f) => (
                  <tr key={f.aliquota}>
                    <td>
                      {reais(f.de)} a {reais(f.ate)}
                    </td>
                    <td>{pct(f.aliquota)}</td>
                    <td>{reais(f.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.inss.noTeto && <p>O salário passa do teto do INSS (R$ 8.475,55): acima dele não há desconto.</p>}
          </details>

          <details className={styles.passo} open>
            <summary>Como o imposto de renda foi calculado</summary>
            <ol>
              <li>
                Descontos permitidos: INSS ({reais(r.inss.total)}){dependentes ? ` + ${dependentes} × ${reais(DEDUCAO_DEPENDENTE)} por dependente` : ""} ={" "}
                {reais(r.deducoesLegais)}. O desconto simplificado é de {reais(DESCONTO_SIMPLIFICADO)}.{" "}
                {r.ir.usaSimplificado ? "Como o simplificado é maior, ele é usado." : "Como os descontos permitidos são maiores, eles são usados."}
              </li>
              <li>
                Base de cálculo: {reais(bruto)} − {reais(r.ir.desconto)} = <strong>{reais(r.ir.base)}</strong> ({r.ir.faixa}ª faixa da tabela, alíquota{" "}
                {pct(r.ir.aliquota)}).
              </li>
              <li>Imposto pela tabela: {reais(r.ir.impostoTabela)}.</li>
              <li>
                Redução da Lei 15.270/2025:{" "}
                {bruto <= 5000
                  ? `salário até R$ 5.000,00, redução de até R$ 312,89, o bastante para zerar o imposto: ${reais(r.ir.reducao)}.`
                  : bruto <= 7350
                    ? `salário entre R$ 5.000,01 e R$ 7.350,00: R$ 978,62 − 0,133145 × ${reais(bruto)} = ${reais(r.ir.reducao)}.`
                    : "salário acima de R$ 7.350,00, sem redução."}
              </li>
              <li>
                Imposto retido: <strong>{reais(r.ir.imposto)}</strong>.
              </li>
            </ol>
          </details>
        </section>
      )}
    </div>
  );
}
