import type { Metadata, Viewport } from "next";

// Fontes servidas pelo próprio site (sem chamadas a terceiros)
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-serif/400.css";
import "./globals.css";
import { Conexao } from "@/components/Conexao";
import { Rodape } from "@/components/Rodape";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000",
  ),
  title: {
    default: "Na Conta — o Brasil na ponta do lápis",
    template: "%s · Na Conta",
  },
  description:
    "Votos, proposições, gastos, emendas e impostos de deputados e senadores, estado por estado, com a fonte oficial ao lado de cada número.",
  applicationName: "Na Conta",
};

export const viewport: Viewport = {
  themeColor: "#f5f4ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        <Conexao />
        {children}
        <Rodape />
      </body>
    </html>
  );
}
