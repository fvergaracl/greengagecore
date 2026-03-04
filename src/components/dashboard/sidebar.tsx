"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type User } from "next-auth"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: "🗺️" },
  { href: "/dashboard/moderation", label: "Moderation", icon: "🔍" },
  { href: "/dashboard/exports", label: "Exports", icon: "📤" },
] as const

interface DashboardUser extends User {
  roles?: string[]
}

export function DashboardSidebar({ user }: { user: DashboardUser }) {
  const pathname = usePathname()
  const isSuperAdmin = user.roles?.includes("superadmin") ?? false

  const displayName = user.name ?? "Researcher"
  const displaySub = user.email ?? ""

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 dark:border-gray-800">
        <span className="text-xl font-bold text-green-600">🌿 GreenCrowd</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}

        {/* Admin link — solo superadmin */}
        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-gray-100 dark:border-gray-800" />
            <Link
              href="/admin/users"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`}
            >
              <span>⚙️</span>
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Language switcher */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <LanguageSwitcher />
      </div>

      {/* User info */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700">
            {displayName[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {displayName}
            </p>
            {displaySub && (
              <p className="truncate text-xs text-gray-500">{displaySub}</p>
            )}
          </div>
        </div>
        <Link
          href="/api/auth/signout"
          className="mt-3 block rounded-lg px-3 py-2 text-center text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          Sign out
        </Link>
      </div>
    </aside>
  )
}
