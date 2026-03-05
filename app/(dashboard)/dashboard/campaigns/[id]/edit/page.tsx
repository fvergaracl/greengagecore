"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

const COMMON_TIMEZONES = [
  "UTC",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Argentina/Buenos_Aires",
] as const

type CampaignStatus = "draft" | "published" | "archived"

interface CampaignData {
  id: string
  name: string
  description: string | null
  category: string
  timezone: string
  startDatetime: string | null
  endDatetime: string | null
  gameEnabled: boolean
  status: CampaignStatus
}

function toLocalDatetimeInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Failed to save campaign"
  if ("error" in payload && typeof payload.error === "string") return payload.error
  return "Failed to save campaign"
}

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [timezone, setTimezone] = useState("UTC")
  const [startDatetime, setStartDatetime] = useState("")
  const [endDatetime, setEndDatetime] = useState("")
  const [gameEnabled, setGameEnabled] = useState(false)
  const [status, setStatus] = useState<CampaignStatus>("draft")

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch(`/api/campaigns/${params.id}`)
        if (!res.ok) {
          throw new Error("Failed to load campaign")
        }
        const campaign: CampaignData = await res.json()
        setName(campaign.name)
        setDescription(campaign.description ?? "")
        setCategory(campaign.category)
        setTimezone(campaign.timezone || "UTC")
        setStartDatetime(toLocalDatetimeInput(campaign.startDatetime))
        setEndDatetime(toLocalDatetimeInput(campaign.endDatetime))
        setGameEnabled(Boolean(campaign.gameEnabled))
        setStatus(campaign.status)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error")
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [params.id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !category.trim() || !timezone.trim()) {
      setError("Name, category and timezone are required.")
      return
    }

    const startIso = startDatetime ? new Date(startDatetime).toISOString() : null
    const endIso = endDatetime ? new Date(endDatetime).toISOString() : null

    if (startIso && endIso && startIso > endIso) {
      setError("Start date must be before end date.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          timezone: timezone.trim(),
          startDatetime: startIso,
          endDatetime: endIso,
          gameEnabled,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(parseErrorMessage(payload))
      }

      router.push(`/dashboard/campaigns/${params.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading campaign…</div>
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
            { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
            { href: `/dashboard/campaigns/${params.id}`, label: "Campaign", emoji: "📢" },
            { label: "Edit", emoji: "✏️" },
          ]}
        />
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          ✏️ Edit Campaign
        </h1>
        <p className="text-sm text-gray-500">
          Update campaign configuration. Current status: <strong>{status}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-4">
          <Field
            label="Name *"
            value={name}
            onChange={setName}
            placeholder="Urban Heat Mapping"
          />
          <Field
            label="Category *"
            value={category}
            onChange={setCategory}
            placeholder="Environment"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Timezone *
            </label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              list="timezone-options"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <datalist id="timezone-options">
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start date (optional)
              </label>
              <input
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                End date (optional)
              </label>
              <input
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={gameEnabled}
              onChange={(e) => setGameEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Enable gamification (GAME engine)
            </span>
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/dashboard/campaigns/${params.id}`}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
    </div>
  )
}
