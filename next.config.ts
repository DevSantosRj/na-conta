import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Fontes usadas pelos cartões-imagem de compartilhamento
  outputFileTracingIncludes: {
    "/parlamentar/**": ["./assets/fonts/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.camara.leg.br" },
      { protocol: "https", hostname: "www.senado.leg.br" },
    ],
  },
};

export default nextConfig;
