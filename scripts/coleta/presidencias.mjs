// Presidências da República, da Câmara e do Senado (scripts/dados/presidencias.json).
// O arquivo é transcrito das listas oficiais e revisado a cada mudança (eleição das Mesas, posse presidencial).
import { readFileSync } from "node:fs";
import { db, gravar } from "./comum.mjs";

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export async function carregar() {
  const { linhas } = JSON.parse(readFileSync(new URL("../dados/presidencias.json", import.meta.url), "utf8"));

  // Liga ao perfil quem está no banco (id da fonte, ou mesmo nome na mesma Casa a partir de 1985)
  const { data: parlamentares, error } = await db.from("parlamentares").select("id, casa, nome_parlamentar");
  if (error) throw new Error(`parlamentares: ${error.message}`);
  const ids = new Set(parlamentares.map((p) => p.id));
  const porNome = new Map(parlamentares.map((p) => [`${p.casa}|${semAcento(p.nome_parlamentar)}`, p.id]));
  for (const l of linhas) {
    if (l.parlamentar_id && !ids.has(l.parlamentar_id)) l.parlamentar_id = null;
    if (!l.parlamentar_id && l.cargo !== "republica" && l.ano_inicio >= 1985) l.parlamentar_id = porNome.get(`${l.cargo}|${semAcento(l.nome)}`) ?? null;
  }
  return gravar("presidencias", linhas, (l) => `${l.cargo}|${l.ordem}`, "cargo,ordem");
}
