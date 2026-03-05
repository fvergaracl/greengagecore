// GreenCrowd V2 — NextAuth v5 + Keycloak configuration
import NextAuth, { type DefaultSession } from "next-auth"
import KeycloakProvider from "next-auth/providers/keycloak"

// Extend session types to include Keycloak roles and sub
declare module "next-auth" {
  interface Session {
    user: {
      sub: string
      roles: string[]
      accessToken: string
    } & DefaultSession["user"]
  }
  interface JWT {
    sub: string
    roles: string[]
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
      authorization: {
        params: {
          scope: "openid profile email"
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Primera vez (login): guardar tokens y roles desde el perfil Keycloak
      if (account && profile) {
        token.accessToken = account.access_token as string
        token.refreshToken = account.refresh_token as string
        token.expiresAt = account.expires_at as number
        // Roles vienen del claim configurado en Keycloak (realm roles)
        const p = profile as Record<string, unknown>
        token.roles = (p.roles as string[]) ?? []
        token.sub = profile.sub as string
      }

      // Refresh token si el access token expiró
      if (Date.now() < (token.expiresAt as number) * 1000 - 30_000) {
        return token
      }

      return refreshAccessToken(token)
    },

    async session({ session, token }) {
      session.user.sub = token.sub as string
      session.user.roles = (token.roles as string[]) ?? []
      session.user.accessToken = token.accessToken as string
      return session
    }
  },

  pages: {
    signIn: "/signin",
    error: "/error"
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60 // 24 horas
  }
})

// Refresca el access token con el refresh token de Keycloak
async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string
      })
    })

    const refreshed = await response.json()

    if (!response.ok) {
      throw refreshed
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in
    }
  } catch {
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

// Helper: verifica si el usuario tiene un rol específico
export function hasRole(
  session: { user?: { roles?: string[] } } | null,
  role: string
): boolean {
  return session?.user?.roles?.includes(role) ?? false
}

export const ROLES = {
  SUPERADMIN: "superadmin",
  RESEARCHER: "researcher",
  CONTRIBUTOR: "contributor"
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]
