import Link from "next/link"

interface BreadcrumbItem {
  label: string
  emoji: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        const content = (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{item.emoji}</span>
            <span>{item.label}</span>
          </span>
        )

        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {!isLast && item.href ? (
              <Link href={item.href} className="hover:text-gray-700 dark:hover:text-gray-200">
                {content}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-gray-700 dark:text-gray-200" : ""}>
                {content}
              </span>
            )}
            {!isLast && <span className="text-gray-400">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
