const { withSentryConfig } = require("@sentry/nextjs")

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["en", "it", "da", "nl", "es"],
    defaultLocale: "en"
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      {
        protocol: "https",
        hostname: "me.greengage-project.eu",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "me.13-50-150-58.nip.io",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "minioapi.13-50-150-58.nip.io",
        pathname: "/**"
      },
      { protocol: "https", hostname: "googleusercontent.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: ".*.googleusercontent.com",
        pathname: "/**"
      }
    ]
  },
  webpack: (config, { isServer }) => {
    return config
  }
}

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "projectgreengage",
    project: "javascript-nextjs"
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true
  }
)
