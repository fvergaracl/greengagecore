// GreenCrowd V2 — API authentication middleware
// Validates Keycloak Bearer tokens via JWKS (no Keycloak call per request).
// Cached in memory for 1 hour.

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"
import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/redis"
import { auth as nextAuthSession, ROLES, type UserRole } from "@/lib/auth"
import { prisma } from "@/lib/db"

// JWKS cached in memory (auto-refreshed by jose)
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (!jwks) {
    const issuer = process.env.KEYCLOAK_ISSUER!
    jwks = createRemoteJWKSet(
      new URL(`${issuer}/protocol/openid-connect/certs`)
    )
  }
  return jwks
}

function getAllowedAudiences(): string[] {
  const raw = process.env.KEYCLOAK_ALLOWED_AUDIENCES
  const audiences = raw
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  if (audiences && audiences.length > 0) {
    return audiences
  }

  return [process.env.KEYCLOAK_CLIENT_ID!]
}

export type AuthenticatedUser = {
  sub: string
  userId: string // GreenCrowd internal ID (resolved to UUID in each handler)
  roles: UserRole[]
  email?: string
  name?: string
}

/**
 * Verifies the Bearer token and returns the user claims.
 * Throws an error if the token is invalid.
 */
export async function verifyToken(token: string): Promise<JWTPayload & { roles?: string[] }> {
  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer: process.env.KEYCLOAK_ISSUER!,
    audience: getAllowedAudiences(),
  })
  return payload as JWTPayload & { roles?: string[] }
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  return auth.slice(7)
}

/**
 * Standard error response for API routes.
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * HOF: wraps an API handler with authentication validation and rate limiting.
 * Injects the authenticated user into the context.
 */
export function withAuth(
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  options: { requiredRoles?: UserRole[] } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"
    const { allowed } = await checkRateLimit(ip)
    if (!allowed) {
      return apiError("Too many requests", 429)
    }

    // Auth: Bearer token (mobile) o NextAuth session cookie (web dashboard)
    const bearerToken = extractBearerToken(req)
    let user: AuthenticatedUser | null = null

    if (bearerToken) {
      // ── Mobile: Keycloak Bearer token via JWKS ──────────────────────────────
      let payload: JWTPayload & { roles?: string[] }
      try {
        payload = await verifyToken(bearerToken)
      } catch {
        return apiError("Invalid or expired token", 401)
      }
      // Upsert user en DB para garantizar que existe y obtener el UUID interno
      const dbUser = await prisma.user.upsert({
        where: { sub: payload.sub! },
        create: { sub: payload.sub! },
        update: {},
        select: { id: true },
      })
      const roles = (payload.roles ?? []) as UserRole[]
      user = {
        sub: payload.sub!,
        userId: dbUser.id,          // DB UUID — mismo campo que usa la session cookie
        roles,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
      }
    } else {
      // ── Web dashboard: NextAuth session cookie ─────────────────────────────
      const session = await nextAuthSession()
      if (session?.user?.sub) {
        user = {
          sub: session.user.sub,
          userId: session.user.id ?? session.user.sub, // ya es DB UUID (auth.ts fix)
          roles: (session.user.roles ?? []) as UserRole[],
        }
      }
    }

    if (!user) return apiError("Authorization required", 401)

    // Verify required roles
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      const hasRequired = options.requiredRoles.some((role) => user!.roles.includes(role))
      if (!hasRequired) {
        return apiError("Insufficient permissions", 403)
      }
    }

    return handler(req, user!)
  }
}

/**
 * Shorthand for routes that require researcher or superadmin.
 */
export function withResearcher(
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requiredRoles: [ROLES.RESEARCHER, ROLES.SUPERADMIN],
  })
}

/**
 * Shorthand for routes that require superadmin.
 */
export function withSuperAdmin(
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withAuth(handler, { requiredRoles: [ROLES.SUPERADMIN] })
}
