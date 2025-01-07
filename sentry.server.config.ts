// sentry.server.config.ts

/**
 * Configures the initialization of Sentry on the server.
 * This configuration is applied whenever the server handles a request.
 * Documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs"

// Ensure the Sentry DSN is provided before initializing
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT || "development",

    // Adjust the tracesSampleRate for performance monitoring.
    // Use `tracesSampler` for finer control if required.
    tracesSampleRate: process?.env?.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable debugging in non-production environments to ease setup and troubleshooting.
    debug: process?.env?.NODE_ENV !== "production"

    // Uncomment to enable Spotlight for enhanced developer experience during development.
    // spotlight: process.env.NODE_ENV === "development",
  })
} else {
  console.warn("Sentry DSN is not provided. Sentry will not be initialized.")
}
