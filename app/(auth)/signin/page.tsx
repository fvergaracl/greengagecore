// Página de inicio de sesión — redirige a Keycloak via NextAuth.

import { redirect } from "next/navigation"
import { auth, signIn } from "@/lib/auth"

export const metadata = { title: "Sign In — GreenCrowd" }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  const { callbackUrl, error } = await searchParams

  // Ya autenticado → redirigir al dashboard
  if (session?.user) redirect(callbackUrl ?? "/dashboard")

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">
        Welcome back
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Sign in with your institutional account to access the research dashboard.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error === "OAuthCallback"
            ? "Authentication failed. Please try again."
            : error === "AccessDenied"
              ? "Access denied. You do not have permission to sign in."
              : "An error occurred during sign in."}
        </div>
      )}

      <form
        action={async () => {
          "use server"
          await signIn("keycloak", {
            redirectTo: callbackUrl ?? "/dashboard",
          })
        }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm-.6 3.6v3.6h-2.4v2.4h2.4v6h2.4v-6h2.4v-2.4h-2.4V6h-2.4z" />
          </svg>
          Continue with Keycloak
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-400">
        Access is restricted to authorized researchers and administrators.
      </p>
    </div>
  )
}
