"use client"

// Dashboard — Crear cuestionario con SurveyJS Creator.
// El investigador diseña el schema visualmente; los archivos (tipo "file") se
// suben a MinIO durante las pruebas en la pestaña Preview.
// En producción, la app móvil sube el archivo y almacena la MinIO key como valor.

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { SurveyCreatorWrapper } from "@/components/questionnaires/SurveyCreatorWrapper"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

type Condition = "before" | "after" | "daily" | "every_x_days"

const CONDITION_OPTIONS: { value: Condition; label: string; description: string }[] = [
  { value: "before", label: "Before campaign", description: "Shown once before the contributor starts" },
  { value: "after", label: "After campaign", description: "Shown once when the campaign ends" },
  { value: "daily", label: "Daily check-in", description: "Shown once per day when the contributor opens the app" },
  { value: "every_x_days", label: "Every N days", description: "Shown every N days during active participation" },
]

export default function NewQuestionnairePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [title, setTitle] = useState("")
  const [condition, setCondition] = useState<Condition>("before")
  const [frequencyInDays, setFrequencyInDays] = useState(7)
  const [surveyJson, setSurveyJson] = useState<object>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El accessToken solo se pasa al Creator para los uploads de archivo en preview.
  // Las llamadas a la API usan la session cookie (withAuth fallback).
  const accessToken = session?.user?.accessToken

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const body = {
        campaignId: params.id,
        title: title.trim(),
        condition,
        frequencyInDays: condition === "every_x_days" ? frequencyInDays : undefined,
        schema: surveyJson,
      }

      const res = await fetch("/api/questionnaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Failed to create questionnaire")
      }

      router.push(`/dashboard/campaigns/${params.id}/questionnaires`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
            { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
            { href: `/dashboard/campaigns/${params.id}`, label: "Campaign", emoji: "📢" },
            {
              href: `/dashboard/campaigns/${params.id}/questionnaires`,
              label: "Questionnaires",
              emoji: "📋",
            },
            { label: "New questionnaire", emoji: "🆕" },
          ]}
        />
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          🆕 New Questionnaire
        </h1>
        <p className="text-sm text-gray-500">
          Design the survey with the editor below. File-type questions upload to MinIO automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Metadata: title + trigger */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Questionnaire title *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                required
                placeholder="e.g. Initial participant survey"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">
                Shown in the dashboard list. You can also set a title inside the editor.
              </p>
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                When to show
              </label>
              <div className="mt-2 space-y-1.5">
                {CONDITION_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="radio"
                      name="condition"
                      value={opt.value}
                      checked={condition === opt.value}
                      onChange={() => setCondition(opt.value)}
                      className="mt-0.5 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {opt.label}
                      </span>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {condition === "every_x_days" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={frequencyInDays}
                    onChange={e => setFrequencyInDays(parseInt(e.target.value) || 7)}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SurveyJS Creator */}
        <div className="rounded-xl border border-gray-200 overflow-hidden dark:border-gray-700">
          <SurveyCreatorWrapper
            onChange={setSurveyJson}
            accessToken={accessToken}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving…" : "Save questionnaire"}
          </button>
          <Link
            href={`/dashboard/campaigns/${params.id}/questionnaires`}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
