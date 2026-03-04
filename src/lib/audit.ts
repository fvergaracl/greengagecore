// GreenCrowd V2 — Audit log helper
// Escribe entradas en audit_logs de forma no bloqueante (fire-and-forget).

import { prisma } from "@/lib/db"
import type { AuditAction } from "@prisma/client"

interface AuditParams {
  actorId?: string
  actorRole?: string
  entityType: string
  entityId?: string
  action: AuditAction
  oldValue?: object
  newValue?: object
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra una acción de auditoría.
 * No lanza errores para no bloquear el flujo principal.
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        action: params.action,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    })
  } catch {
    // Audit failures silenciosas — no interrumpir el flujo principal
  }
}

/** Extrae IP de la request para auditoría. */
export function getRequestIp(req: { headers: Headers | { get(name: string): string | null } }): string | undefined {
  const headers = req.headers
  const h = "get" in headers ? headers : new Headers(headers as Record<string, string>)
  return h.get("x-forwarded-for")?.split(",")[0].trim()
    ?? h.get("x-real-ip")
    ?? undefined
}
