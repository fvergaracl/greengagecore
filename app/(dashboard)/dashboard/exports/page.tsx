// Dashboard — Export management.
// Researcher elige campaña, formato y rango de fechas.
// El job se encola async; la notificación push avisa cuando está listo.

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "Exports — GreenCrowd" }

async function requestExport(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")

  const campaignId = formData.get("campaignId") as string
  const format = formData.get("format") as "csv" | "geojson"
  const dateFrom = formData.get("dateFrom") as string
  const dateTo = formData.get("dateTo") as string

  if (!campaignId || !format) return

  // Verificar ownership y enqueue
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: session.user.id },
  })
  if (!campaign) return

  const { exportQueue } = await import("@/workers/index")
  await exportQueue.add("export", {
    campaignId,
    requestedBy: session.user.id,
    format,
    filters: {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
  })

  redirect("/dashboard/exports?queued=1")
}

export default async function ExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string }>
}) {
  const session = await auth()
  const { queued } = await searchParams

  const campaigns = await prisma.campaign.findMany({
    where: { researcherId: session!.user!.id! },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  })

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Exports
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Export contribution data as CSV or GeoJSON. Large exports are processed
        asynchronously — you will receive a push notification when the file is ready.
      </p>

      {queued === "1" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          ✅ Export queued! You will receive a notification when it is ready.
        </div>
      )}

      <form action={requestExport} className="space-y-5">
        {/* Campaign selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Campaign *
          </label>
          <select
            name="campaignId"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">Select a campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Format *
          </label>
          <div className="flex gap-4">
            {(
              [
                ["csv", "CSV", "Spreadsheet-compatible, one row per contribution"],
                ["geojson", "GeoJSON", "Geo-referenced, compatible with QGIS and Leaflet"],
              ] as [string, string, string][]
            ).map(([value, label, desc]) => (
              <label
                key={value}
                className="flex flex-1 cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 hover:border-green-400 dark:border-gray-700"
              >
                <input
                  type="radio"
                  name="format"
                  value={value}
                  className="mt-0.5"
                  defaultChecked={value === "csv"}
                />
                <span>
                  <span className="block font-medium text-gray-900 dark:text-gray-100">
                    {label}
                  </span>
                  <span className="text-xs text-gray-500">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              From date
            </label>
            <input
              name="dateFrom"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              To date
            </label>
            <input
              name="dateTo"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Request export
        </button>
      </form>

      {/* Info box */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        <p className="font-medium text-gray-800 dark:text-gray-200">ℹ️ How exports work</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Exports include only <strong>submitted</strong> and <strong>validated</strong> contributions.</li>
          <li>Large exports are processed in the background (BullMQ worker).</li>
          <li>A signed download link is sent via push notification and expires in <strong>24 hours</strong>.</li>
          <li>
            CSV includes: ID, task, coordinates, status, timestamp, survey data.
          </li>
          <li>GeoJSON includes all fields plus geometry for mapping tools.</li>
        </ul>
      </div>
    </div>
  )
}
