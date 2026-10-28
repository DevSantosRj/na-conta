// Conferência: compara, votação por votação, o placar oficial da Câmara (votosSim / votosNao do arquivo anual)
// com a contagem dos votos gravados no banco. Diferença = robô com defeito.
import { db, lerCsv } from "./comum.mjs";

export async function conferirCamara(ano) {
  const oficial = new Map();
  for await (const l of lerCsv(`https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-${ano}.csv`, ["id", "votosSim", "votosNao"])) {
    oficial.set(`C-${l.id}`, { sim: Number(l.votosSim), nao: Number(l.votosNao) });
  }

  const nossas = new Map();
  const { data: votacoes, error: e1 } = await db
    .from("votacoes")
    .select("id")
    .eq("casa", "camara")
    .gte("data", `${ano}-01-01`)
    .lt("data", `${ano + 1}-01-01`);
  if (e1) throw new Error(e1.message);
  const ids = votacoes.map((v) => v.id);

  for (let i = 0; i < ids.length; i += 50) {
    for (let de = 0; ; de += 1000) {
      const { data, error } = await db.from("votos").select("votacao_id, voto").in("votacao_id", ids.slice(i, i + 50)).range(de, de + 999);
      if (error) throw new Error(error.message);
      for (const v of data) {
        const c = nossas.get(v.votacao_id) ?? { sim: 0, nao: 0 };
        if (v.voto === "sim") c.sim++;
        if (v.voto === "nao") c.nao++;
        nossas.set(v.votacao_id, c);
      }
      if (data.length < 1000) break;
    }
  }

  const diferencas = [];
  let certas = 0;
  for (const id of ids) {
    const o = oficial.get(id);
    const n = nossas.get(id) ?? { sim: 0, nao: 0 };
    if (!o) continue;
    if (o.sim === n.sim && o.nao === n.nao) certas++;
    else diferencas.push(`${id}: oficial ${o.sim}x${o.nao}, banco ${n.sim}x${n.nao}`);
  }
  console.log(`Conferência ${ano}: ${certas} de ${ids.length} votações com placar idêntico ao oficial.`);
  if (diferencas.length) throw new Error(`${diferencas.length} divergência(s): ${diferencas.slice(0, 15).join(" | ")}`);
  return certas;
}
