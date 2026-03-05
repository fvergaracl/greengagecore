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

export function NewTaskFormClient({ campaignId, pois }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = session?.user?.accessToken

  const [poiId, setPoiId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<TaskType>("mixed")
  const [requiresPhoto, setRequiresPhoto] = useState(false)
  const [requiresSurvey, setRequiresSurvey] = useState(false)
  const [responseLimit, setResponseLimit] = useState("")
  const [closureMode, setClosureMode] = useState<ClosureMode>("unlimited")
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

    setSubmitting(true)
    setError(null)

    const effectiveRequiresPhoto = requiresPhoto || type === "photo" || type === "mixed"
    const effectiveRequiresSurvey = requiresSurvey || type === "survey" || type === "mixed"

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

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={requiresPhoto}
              onChange={(e) => setRequiresPhoto(e.target.checked)}
              className="rounded"
            />
            Requires photo
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={requiresSurvey}
              onChange={(e) => setRequiresSurvey(e.target.checked)}
              className="rounded"
            />
            Requires survey
          </label>
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
