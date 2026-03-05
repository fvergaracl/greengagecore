// Admin — Audit log: historial de acciones del sistema.

"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import type { AuditStats } from "@/components/audit/AuditCharts"

const AuditCharts = dynamic(
  () => import("@/components/audit/AuditCharts").then((m) => m.AuditCharts),
  { ssr: false }
)

type AuditAction =
  | "create" | "update" | "delete" | "publish"
  | "archive" | "export" | "login" | "logout"

interface LogEntry {
  id: string
  actorId: string | null
  actorRole: string | null
  entityType: string
  entityId: string | null
  action: AuditAction
  oldValue: unknown
  newValue: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  actor: { id: string; alias: string | null; sub: string } | null
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

const ACTION_COLORS: Record<AuditAction, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  publish: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  archive: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  export: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
  login: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  logout: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

const ENTITY_TYPES = ["Campaign", "Area", "Task", "Contribution", "User", "Questionnaire"]
const ACTIONS: AuditAction[] = ["create", "update", "delete", "publish", "archive", "export", "login", "logout"]

function AuditLogTable() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState<AuditStats | null>(null)

  // Filters state (synced from URL)
  const page = parseInt(searchParams.get("page") ?? "1")
  const entityType = searchParams.get("entityType") ?? ""
  const action = searchParams.get("action") ?? ""
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "25")
      if (entityType) params.set("entityType", entityType)
      if (action) params.set("action", action)
      if (from) params.set("from", from)
      if (to) params.set("to", to)

      const res = await fetch(`/api/audit?${params}`)
      if (!res.ok) throw new Error("Failed to load audit logs")
      const data = await res.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } finally {
      setLoading(false)
    }
  }, [page, entityType, action, from, to])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (entityType) params.set("entityType", entityType)
      if (action) params.set("action", action)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`/api/audit/stats?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setStats(data)
    } catch {
      // non-critical — charts just won't show
    }
  }, [entityType, action, from, to])

  useEffect(() => { fetchStats() }, [fetchStats])

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set("page", "1")
    router.push(`/admin/audit?${params}`)
  }

  function navigate(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`/admin/audit?${params}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
          {pagination && (
            <p className="text-sm text-gray-500">{pagination.total.toLocaleString()} events</p>
          )}
        </div>
      </div>

      {/* Charts */}
      {stats ? (
        <AuditCharts stats={stats} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <select
          value={entityType}
          onChange={(e) => updateFilter("entityType", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={action}
          onChange={(e) => updateFilter("action", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => updateFilter("from", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          title="From"
        />
        <span className="self-center text-xs text-gray-400">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => updateFilter("to", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          title="To"
        />

        {(entityType || action || from || to) && (
          <button
            onClick={() => router.push("/admin/audit")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-700 dark:bg-gray-900">
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Time</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Actor</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Action</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Entity</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">IP</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">No events found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {log.actor?.alias ?? "System"}
                      </span>
                      {log.actorRole && (
                        <span className="ml-1 text-xs text-gray-400">({log.actorRole})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{log.entityType}</span>
                      {log.entityId && (
                        <span className="ml-1 font-mono text-xs text-gray-400">
                          {log.entityId.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {log.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {(log.oldValue != null || log.newValue != null) ? (log.id === expandedId ? "▲" : "▼") : ""}
                    </td>
                  </tr>

                  {/* Expanded diff row */}
                  {expandedId === log.id && (log.oldValue != null || log.newValue != null) && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50 dark:bg-gray-900/50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.oldValue != null && (
                            <div>
                              <p className="mb-1 font-semibold text-gray-500">Before</p>
                              <pre className="overflow-auto rounded bg-red-50 p-2 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValue != null && (
                            <div>
                              <p className="mb-1 font-semibold text-gray-500">After</p>
                              <pre className="overflow-auto rounded bg-green-50 p-2 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <button
                onClick={() => navigate(pagination.page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                ← Previous
              </button>
            )}
            {pagination.page < pagination.pages && (
              <button
                onClick={() => navigate(pagination.page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-gray-400">Loading…</div>}>
      <AuditLogTable />
    </Suspense>
  )
}
