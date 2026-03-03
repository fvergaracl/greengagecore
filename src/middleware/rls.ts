// GreenCrowd V2 — Row Level Security context injection
// Injects the PostgreSQL session context so RLS policies work correctly.

import { prisma, withRLS, type RLSContext } from "@/lib/db"
import type { AuthenticatedUser } from "./auth"
import { getUserBySub } from "@/domains/auth/user-sync"
import { ROLES } from "@/lib/auth"

/**
 * Resolves the internal userId (UUID from the users table) from the Keycloak sub.
 * Creates the user if it does not exist (first login).
 */
export async function resolveUserId(sub: string): Promise<string> {
  const user = await getUserBySub(sub).catch(async () => {
    // If not found, create it (should not happen if auth middleware is working correctly)
    return prisma.user.upsert({
      where: { sub },
      create: { sub },
      update: {},
      select: { id: true, sub: true },
    })
  })
  return user.id
}

/**
 * Builds the RLS context for an authenticated user.
 */
export async function buildRLSContext(user: AuthenticatedUser): Promise<RLSContext> {
  const userId = await resolveUserId(user.sub)
  const userRole = user.roles.includes(ROLES.SUPERADMIN)
    ? "superadmin"
    : user.roles.includes(ROLES.RESEARCHER)
    ? "researcher"
    : "contributor"

  return { userId, userRole }
}

/**
 * Executes a DB operation with the authenticated user's RLS context.
 * Typical usage in API handlers.
 */
export async function withUserRLS<T>(
  user: AuthenticatedUser,
  fn: (tx: typeof prisma, context: { userId: string; userRole: string }) => Promise<T>
): Promise<T> {
  const context = await buildRLSContext(user)
  return withRLS(context, (tx) => fn(tx, context))
}
