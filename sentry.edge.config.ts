// sentry.edge.config.ts

/**
 * Configures the initialization of Sentry for edge features.
 * This configuration is applied whenever an edge feature (e.g., middleware, edge routes) is loaded.
 * Note: This is unrelated to the Vercel Edge Runtime and is also required for local development.
 * Documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs"

// Ensure the Sentry DSN is provided before initializing
const SENTRY_DSN = process?.env?.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process?.env?.NEXT_PUBLIC_SENTRY_ENVIRONMENT

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT || "development",

    // Adjust the tracesSampleRate for performance monitoring in production.
    // Use `tracesSampler` for more granular control if needed.
    tracesSampleRate: process?.env?.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable debugging in non-production environments for easier setup troubleshooting.
    debug: process?.env?.NODE_ENV !== "production"
  })
} else {
  console.warn(
    "Sentry DSN is not provided. Sentry for edge features will not be initialized."
  )
}
