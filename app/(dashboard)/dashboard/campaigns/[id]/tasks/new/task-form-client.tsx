"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { FormEvent, useMemo, useState } from "react"
import { SurveyCreatorWrapper } from "@/components/questionnaires/SurveyCreatorWrapper"

type TaskType = "photo" | "survey" | "mixed" | "instruction"
type ClosureMode = "single" | "threshold" | "unlimited"

interface PoiOption {
  id: string
  name: string
  areaId: string
  areaName: string
}

interface Props {
  campaignId: string
  pois: PoiOption[]
}

function hasSurveyContent(schema: object) {
  const candidate = schema as {
    pages?: unknown[]
    elements?: unknown[]
  }
  return (candidate.pages?.length ?? 0) > 0 || (candidate.elements?.length ?? 0) > 0
}

function parseApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Failed to create task"
  if ("error" in payload && typeof payload.error === "string") return payload.error
  return "Failed to create task"
}

function toIsoFromLocalDateTime(date: string, time: string) {
  if (!date) return undefined
  const safeTime = time || "00:00"
  const value = new Date(`${date}T${safeTime}`)
  if (Number.isNaN(value.getTime())) return null
  return value.toISOString()
}

export function NewTaskFormClient({ campaignId, pois }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = session?.user?.accessToken

  const [poiId, setPoiId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<TaskType>("mixed")
  const [responseLimit, setResponseLimit] = useState("")
  const [closureMode, setClosureMode] = useState<ClosureMode>("unlimited")
  const [availableFromDate, setAvailableFromDate] = useState("")
  const [availableFromTime, setAvailableFromTime] = useState("")
  const [availableToDate, setAvailableToDate] = useState("")
  const [availableToTime, setAvailableToTime] = useState("")
  const [taskSchema, setTaskSchema] = useState<object>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupedPois = useMemo(() => {
    const byArea = new Map<string, { areaName: string; values: PoiOption[] }>()
    for (const poi of pois) {
      const key = poi.areaId
      const group = byArea.get(key)
      if (group) {
        group.values.push(poi)
      } else {
        byArea.set(key, { areaName: poi.areaName, values: [poi] })
      }
    }
    return Array.from(byArea.entries()).map(([areaId, group]) => ({
      areaId,
      areaName: group.areaName,
      pois: group.values,
    }))
  }, [pois])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!poiId.trim() || !title.trim()) {
      setError("POI and title are required.")
      return
    }

    if ((type === "survey" || type === "mixed") && !hasSurveyContent(taskSchema)) {
      setError("Survey or mixed tasks need a SurveyJS schema with at least one question.")
      return
    }

    const availableFromIso = toIsoFromLocalDateTime(
      availableFromDate,
      availableFromTime
    )
    const availableToIso = toIsoFromLocalDateTime(availableToDate, availableToTime)
    if (availableFromIso === null) {
      setError("Invalid start date/time.")
      return
    }
    if (availableToIso === null) {
      setError("Invalid end date/time.")
      return
    }
    if (availableFromIso && availableToIso && availableFromIso > availableToIso) {
      setError("Availability start must be before end.")
      return
    }

    setSubmitting(true)
    setError(null)

    const effectiveRequiresPhoto = type === "photo" || type === "mixed"
    const effectiveRequiresSurvey = type === "survey" || type === "mixed"

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poiId,
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          taskData: taskSchema,
          requiresPhoto: effectiveRequiresPhoto,
          requiresSurvey: effectiveRequiresSurvey,
          responseLimit: responseLimit.trim() ? Number(responseLimit) : undefined,
          closureMode,
          availableFrom: availableFromIso,
          availableTo: availableToIso,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(parseApiError(payload))
      }

      router.push(`/dashboard/campaigns/${campaignId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              POI *
            </label>
            <select
              value={poiId}
              onChange={(e) => setPoiId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Select a POI…</option>
              {groupedPois.map((group) => (
                <optgroup key={group.areaId} label={`Area: ${group.areaName}`}>
                  {group.pois.map((poi) => (
                    <option key={poi.id} value={poi.id}>
                      📌 {poi.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="photo">Photo</option>
              <option value="survey">Survey</option>
              <option value="mixed">Mixed (photo + survey)</option>
              <option value="instruction">Instruction</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder="Take a photo of the park"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Response limit per user
            </label>
            <input
              value={responseLimit}
              onChange={(e) => setResponseLimit(e.target.value)}
              type="number"
              min="1"
              placeholder="Unlimited"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Closure mode
            </label>
            <select
              value={closureMode}
              onChange={(e) => setClosureMode(e.target.value as ClosureMode)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="unlimited">Unlimited</option>
              <option value="single">Single response</option>
              <option value="threshold">Threshold</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Available from (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={availableFromDate}
                onChange={(e) => {
                  const nextDate = e.target.value
                  setAvailableFromDate(nextDate)
                  if (!nextDate) setAvailableFromTime("")
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="time"
                value={availableFromTime}
                onChange={(e) => setAvailableFromTime(e.target.value)}
                step={60}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Hour optional (defaults to 00:00). If date is empty, time is ignored.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAvailableFromDate("")
                  setAvailableFromTime("")
                }}
                className="text-xs font-medium text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Available to (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={availableToDate}
                onChange={(e) => {
                  const nextDate = e.target.value
                  setAvailableToDate(nextDate)
                  if (!nextDate) setAvailableToTime("")
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="time"
                value={availableToTime}
                onChange={(e) => setAvailableToTime(e.target.value)}
                step={60}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Hour optional (defaults to 00:00). If date is empty, time is ignored.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAvailableToDate("")
                  setAvailableToTime("")
                }}
                className="text-xs font-medium text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
          Survey schema (SurveyJS)
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          For survey or mixed tasks, define the form with the editor below.
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <SurveyCreatorWrapper onChange={setTaskSchema} accessToken={accessToken} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3 pb-6">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create task"}
        </button>
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
