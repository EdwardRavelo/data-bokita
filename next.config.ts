import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Los escudos ya vienen achicados del CDN de ESPN (ver logoSrc): no se usa el
    // optimizador de Vercel, que en el plan gratis tiene un cupo de 5.000 por mes.
    unoptimized: true,
  },
  // El archivo de temporadas se lee con fs en tiempo de ejecución.
  outputFileTracingIncludes: {
    "/**": ["./data/archive/**/*"],
  },
};

export default nextConfig;
