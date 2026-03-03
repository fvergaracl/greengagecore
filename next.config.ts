import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Para Docker multi-stage build

  // Dominios de imágenes permitidos (MinIO)
  images: {
    remotePatterns: [
      {
        protocol: process.env.MINIO_USE_SSL === "true" ? "https" : "http",
        hostname: process.env.MINIO_ENDPOINT ?? "localhost",
        port: process.env.MINIO_PORT ?? "9000",
        pathname: `/${process.env.MINIO_BUCKET ?? "greencrowd-attachments"}/**`,
      },
    ],
  },

  // Variables públicas de entorno
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=self, microphone=(), geolocation=self",
          },
        ],
      },
    ];
  },

  // Webpack: ignorar módulos de Node.js en el cliente
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
