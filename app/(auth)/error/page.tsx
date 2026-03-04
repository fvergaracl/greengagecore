// Página de error de autenticación NextAuth.

import Link from "next/link"

export const metadata = { title: "Auth Error — GreenCrowd" }

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign in link is no longer valid. It may have been used already or it may have expired.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from the OAuth provider.",
  OAuthCreateAccount: "Could not create an OAuth account in the database.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An unexpected authentication error occurred.",
}

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = ERROR_MESSAGES[error ?? "Default"] ?? ERROR_MESSAGES.Default

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl dark:bg-red-900/30">
          ⚠️
        </span>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Authentication Error
        </h1>
      </div>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      {error && (
        <p className="mb-4 rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          Error code: {error}
        </p>
      )}
      <Link
        href="/signin"
        className="block rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-700 transition-colors"
      >
        Try signing in again
      </Link>
    </div>
  )
}
