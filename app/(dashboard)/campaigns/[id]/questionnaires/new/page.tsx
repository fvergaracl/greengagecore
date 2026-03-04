// Dashboard — Crear nuevo cuestionario con el builder de preguntas.

"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { QuestionBuilder, type Question } from "@/components/questionnaires/QuestionBuilder"

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

  const [title, setTitle] = useState("")
  const [condition, setCondition] = useState<Condition>("before")
  const [frequencyInDays, setFrequencyInDays] = useState(7)
  const [questions, setQuestions] = useState<Question[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validación básica
  const nameSet = new Set(questions.map((q) => q.name).filter(Boolean))
  const hasDuplicateNames = nameSet.size < questions.filter((q) => q.name).length
  const allNamed = questions.every((q) => q.name && q.title)
  const canSubmit = title.trim() && questions.length > 0 && allNamed && !hasDuplicateNames

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const body = {
        campaignId: params.id,
        title: title.trim(),
        condition,
        frequencyInDays: condition === "every_x_days" ? frequencyInDays : undefined,
        questions: questions.map(({ _localId: _, ...q }) => q),
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/campaigns/${params.id}/questionnaires`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Questionnaires
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Questionnaire
        </h1>
        <p className="text-sm text-gray-500">
          Build a questionnaire that contributors will see at the specified time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title + trigger condition */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Questionnaire title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="e.g. Initial participant survey"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              When to show
            </label>
            <div className="mt-2 space-y-2">
              {CONDITION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-start gap-3">
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
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm text-gray-700 dark:text-gray-300">Every</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={frequencyInDays}
                  onChange={(e) => setFrequencyInDays(parseInt(e.target.value) || 7)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">days</label>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Questions ({questions.length})
            </h2>
            {hasDuplicateNames && (
              <span className="text-xs text-red-600">⚠ Duplicate field names</span>
            )}
          </div>
          <QuestionBuilder questions={questions} onChange={setQuestions} />
        </div>

        {/* Preview JSON */}
        {questions.length > 0 && (
          <details className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <summary className="cursor-pointer text-xs font-medium text-gray-500">
              Preview SurveyJS schema
            </summary>
            <pre className="mt-3 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
              {JSON.stringify(
                {
                  title,
                  pages: [{ name: "page1", elements: questions.map(({ _localId: _, ...q }) => q) }],
                },
                null,
                2
              )}
            </pre>
          </details>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating…" : "Create questionnaire"}
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
