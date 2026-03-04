// Admin layout — requiere rol superadmin.

import { redirect } from "next/navigation"
import { auth, hasRole, ROLES } from "@/lib/auth"
import Link from "next/link"

const ADMIN_NAV = [
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/audit", label: "Audit Log", icon: "📋" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/signin")
  if (!hasRole(session, ROLES.SUPERADMIN)) redirect("/dashboard")

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Admin sidebar */}
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
          <span className="text-sm font-bold text-red-600">⚙️ Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {ADMIN_NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-center text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            ← Back to dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
