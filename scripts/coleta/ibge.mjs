// População estimada pelo IBGE (SIDRA, tabela 6579) por estado e por município.
import { baixarJson, db, gravar } from "./comum.mjs";

const SIDRA = (nivel) =>
  `https://apisidra.ibge.gov.br/values/t/6579/${nivel}/all/v/9324/p/last`;
const FONTE = "https://sidra.ibge.gov.br/tabela/6579";

// Código IBGE do estado → sigla
const UF = {
  11: "RO",
  12: "AC",
  13: "AM",
  14: "RR",
  15: "PA",
  16: "AP",
  17: "TO",
  21: "MA",
  22: "PI",
  23: "CE",
  24: "RN",
  25: "PB",
  26: "PE",
  27: "AL",
  28: "SE",
  29: "BA",
  31: "MG",
  32: "ES",
  33: "RJ",
  35: "SP",
  41: "PR",
  42: "SC",
  43: "RS",
  50: "MS",
  51: "MT",
  52: "GO",
  53: "DF",
};

async function linhas(nivel) {
  const r = await baixarJson(SIDRA(nivel));
  if (!Array.isArray(r) || r.length < 2)
    throw new Error(`SIDRA ${nivel}: resposta vazia`);
  return r.slice(1).filter((l) => /^\d+$/.test(l.V));
}

export async function populacao() {
  let n = 0;
  for (const l of await linhas("n3")) {
    const uf = UF[Number(l.D1C)];
    if (!uf) continue;
    const { error } = await db
      .from("estados")
      .update({
        populacao: Number(l.V),
        populacao_ano: Number(l.D3C),
        fonte_url: FONTE,
      })
      .eq("uf", uf);
    if (error) throw new Error(`estados: ${error.message}`);
    n++;
  }
  if (n !== 27) throw new Error(`esperava 27 estados, vieram ${n}`);

  // Municípios: "Nome - UF" e código IBGE de 7 dígitos
  const municipios = (await linhas("n6")).map((l) => {
    const m = /^(.*) - ([A-Z]{2})$/.exec(l.D1N);
    return {
      ibge_id: Number(l.D1C),
      nome: m ? m[1] : l.D1N,
      uf: m ? m[2] : UF[Number(String(l.D1C).slice(0, 2))],
      populacao: Number(l.V),
      populacao_ano: Number(l.D3C),
      fonte_url: FONTE,
    };
  });
  n += await gravar("municipios", municipios, (l) => l.ibge_id, "ibge_id");
  return n;
}
