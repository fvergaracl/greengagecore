// sentry.client.config.ts

/**
 * Configures the initialization of Sentry on the client-side.
 * This configuration is applied whenever a user loads a page in their browser.
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

    // Adjust the tracesSampleRate in production for performance monitoring.
    // Use `tracesSampler` for more granular control if needed.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable debugging in non-production environments for better troubleshooting.
    debug: process.env.NODE_ENV !== "production",

    // Configure session replay sampling rates.
    // Adjust these values based on your requirements in production.
    replaysOnErrorSampleRate: 1.0, // Record all sessions with errors
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // Sample a fraction of sessions

    // Sentry integrations: Include the Replay feature for session recordings.
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true, // Mask all text inputs to avoid sensitive data leaks
        blockAllMedia: true // Block all media elements from being captured
      })
    ]
  })
} else {
  console.warn("Sentry DSN is not provided. Sentry will not be initialized.")
}
