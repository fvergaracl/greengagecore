// Admin — Gestión de usuarios: listar, buscar, deshabilitar/habilitar.

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

interface UserRow {
  id: string
  sub: string
  alias: string | null
  isDisabled: boolean
  createdAt: string
  contributions: number
  campaigns: number
  totalPoints: number
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

function UsersTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<UserRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [toggling, setToggling] = useState<string | null>(null)

  const page = parseInt(searchParams.get("page") ?? "1")

  const fetchUsers = useCallback(
    async (q: string, p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/admin/users?search=${encodeURIComponent(q)}&page=${p}&limit=20`
        )
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? `Error ${res.status}`)
        }
        const data = await res.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchUsers(search, page)
  }, [fetchUsers, search, page])

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem("search") as HTMLInputElement).value
    setSearch(q)
    router.push(`/admin/users?search=${encodeURIComponent(q)}&page=1`)
  }

  async function toggleUser(userId: string, currentlyDisabled: boolean) {
    setToggling(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !currentlyDisabled }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? "Failed to update user")
        return
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isDisabled: !currentlyDisabled } : u
        )
      )
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
          {pagination && (
            <p className="text-sm text-gray-500">{pagination.total} users total</p>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by alias or sub…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 w-64"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">
                User
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">
                Sub (Keycloak)
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                Contributions
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                Campaigns
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                Points
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">
                Joined
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 ${
                    user.isDisabled ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {(user.alias ?? user.sub)[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {user.alias ?? <span className="italic text-gray-400">no alias</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[200px] truncate">
                    {user.sub}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {user.contributions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {user.campaigns}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {user.totalPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isDisabled
                          ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                    >
                      {user.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleUser(user.id, user.isDisabled)}
                      disabled={toggling === user.id}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        user.isDisabled
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
                      } disabled:opacity-50`}
                    >
                      {toggling === user.id
                        ? "…"
                        : user.isDisabled
                          ? "Enable"
                          : "Disable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <button
                onClick={() =>
                  router.push(
                    `/admin/users?search=${encodeURIComponent(search)}&page=${pagination.page - 1}`
                  )
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                ← Previous
              </button>
            )}
            {pagination.page < pagination.pages && (
              <button
                onClick={() =>
                  router.push(
                    `/admin/users?search=${encodeURIComponent(search)}&page=${pagination.page + 1}`
                  )
                }
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-gray-400">Loading…</div>}>
      <UsersTable />
    </Suspense>
  )
}
