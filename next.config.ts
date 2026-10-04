import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Escudos que informa ESPN en sus respuestas.
    remotePatterns: [new URL("https://a.espncdn.com/i/teamlogos/**")],
  },
};

export default nextConfig;
