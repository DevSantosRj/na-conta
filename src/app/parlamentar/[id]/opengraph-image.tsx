import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buscarParlamentar, resumoVotos } from "@/lib/dados";
import { CASA } from "@/lib/formato";

// Cartão-imagem que aparece ao compartilhar o perfil no X e no WhatsApp.
export const alt = "Perfil do parlamentar no Na Conta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonte = (arquivo: string) => readFile(join(process.cwd(), "assets/fonts", arquivo));

export default async function Imagem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, titulo, texto, mono] = await Promise.all([
    buscarParlamentar(id),
    fonte("space-grotesk-latin-700-normal.woff"),
    fonte("ibm-plex-sans-latin-400-normal.woff"),
    fonte("ibm-plex-mono-latin-400-normal.woff"),
  ]);
  const r = p ? await resumoVotos([p.id, p.outra_casa_id].filter(Boolean).sort() as string[]) : null;
  const nome = p?.nome_parlamentar ?? "Parlamentar";
  const linha = p ? `${CASA[p.casa].cargo} · ${p.uf}${p.partido_atual ? ` · ${p.partido_atual}` : ""}` : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F5F4EF", padding: 64, fontFamily: "Texto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Titulo", fontSize: 34, color: "#15171A" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#15171A", color: "#F5F4EF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>N</div>
          Na Conta
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Titulo", fontSize: nome.length > 22 ? 64 : 80, color: "#15171A", lineHeight: 1.05 }}>{nome}</div>
          <div style={{ marginTop: 14, fontSize: 32, color: "#3D4148" }}>{linha}</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {r &&
            [
              ["Votações registradas", r.total],
              ["Votos Sim", r.porTipo.sim],
              ["Votos Não", r.porTipo.nao],
              ["Proposições como autor", r.proposicoes],
            ].map(([rotulo, valor]) => (
              <div key={String(rotulo)} style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #DDDBD3", borderRadius: 16, padding: "18px 22px", flex: 1 }}>
                <div style={{ fontSize: 20, color: "#5B6068" }}>{rotulo}</div>
                <div style={{ fontFamily: "Titulo", fontSize: 44, color: "#1D3F9E" }}>{Number(valor).toLocaleString("pt-BR")}</div>
              </div>
            ))}
        </div>
        <div style={{ fontFamily: "Mono", fontSize: 20, color: "#5B6068" }}>Fonte: dados abertos da Câmara e do Senado · na-conta</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Titulo", data: titulo, weight: 700, style: "normal" },
        { name: "Texto", data: texto, weight: 400, style: "normal" },
        { name: "Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
