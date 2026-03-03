// GreenCrowd V2 — Prisma client singleton
// Recommended pattern for Next.js: avoid multiple instances in development
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// ─────────────────────────────────────────────────────────────
// Helpers for Row Level Security (RLS)
// Injected into each request context before executing queries.
// ─────────────────────────────────────────────────────────────

export type RLSContext = {
  userId: string
  userRole: string
}

/**
 * Executes a code block with the active RLS context.
 * Sets the PostgreSQL session variables used by RLS policies.
 */
export async function withRLS<T>(
  context: RLSContext,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Inject session context for RLS
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true),
              set_config('app.user_role', $2, true)`,
      context.userId,
      context.userRole
    )
    return fn(tx as unknown as PrismaClient)
  })
}

/**
 * Executes a raw geospatial query with parameters.
 * PostGIS return types are not in Prisma, so we use $queryRaw.
 */
export async function geoQuery<T>(
  sql: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return prisma.$queryRaw<T[]>(sql, ...values)
}
