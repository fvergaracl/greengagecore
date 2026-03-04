"use client"

// Constructor de preguntas para cuestionarios GreenCrowd.
// Genera schema SurveyJS-compatible via /api/questionnaires POST.

import { useState } from "react"

export type QuestionType = "text" | "number" | "boolean" | "select" | "multiselect" | "range" | "photo"

export interface Question {
  _localId: string   // ID temporal para React key
  name: string       // snake_case, único en el cuestionario
  title: string      // Label visible
  type: QuestionType
  required: boolean
  choices?: string[] // para select/multiselect
  min?: number
  max?: number
  placeholder?: string
}

interface Props {
  questions: Question[]
  onChange: (questions: Question[]) => void
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "📝 Text",
  number: "🔢 Number",
  boolean: "✅ Yes/No",
  select: "📋 Single choice",
  multiselect: "☑️ Multiple choice",
  range: "⭐ Rating scale",
  photo: "📷 Photo",
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

function newQuestion(): Question {
  return {
    _localId: Math.random().toString(36).slice(2),
    name: "",
    title: "",
    type: "text",
    required: false,
  }
}

export function QuestionBuilder({ questions, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function addQuestion() {
    const q = newQuestion()
    onChange([...questions, q])
    setExpandedId(q._localId)
  }

  function removeQuestion(localId: string) {
    onChange(questions.filter((q) => q._localId !== localId))
    if (expandedId === localId) setExpandedId(null)
  }

  function updateQuestion(localId: string, patch: Partial<Question>) {
    onChange(
      questions.map((q) => {
        if (q._localId !== localId) return q
        const updated = { ...q, ...patch }
        // Auto-generar name desde title si name está vacío
        if (patch.title && !q.name) {
          updated.name = slugify(patch.title)
        }
        return updated
      })
    )
  }

  function moveQuestion(localId: string, direction: "up" | "down") {
    const idx = questions.findIndex((q) => q._localId === localId)
    if (idx < 0) return
    const newIdx = direction === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= questions.length) return
    const arr = [...questions]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    onChange(arr)
  }

  function addChoice(localId: string) {
    const q = questions.find((q) => q._localId === localId)
    if (!q) return
    updateQuestion(localId, { choices: [...(q.choices ?? []), ""] })
  }

  function updateChoice(localId: string, idx: number, value: string) {
    const q = questions.find((q) => q._localId === localId)
    if (!q) return
    const choices = [...(q.choices ?? [])]
    choices[idx] = value
    updateQuestion(localId, { choices })
  }

  function removeChoice(localId: string, idx: number) {
    const q = questions.find((q) => q._localId === localId)
    if (!q) return
    updateQuestion(localId, { choices: (q.choices ?? []).filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
          No questions yet. Click "Add question" to start building.
        </div>
      )}

      {questions.map((q, idx) => (
        <div
          key={q._localId}
          className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          {/* Question header */}
          <div
            className="flex cursor-pointer items-center gap-3 px-4 py-3"
            onClick={() => setExpandedId(expandedId === q._localId ? null : q._localId)}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {q.title || <span className="italic text-gray-400">Untitled question</span>}
            </span>
            <span className="text-xs text-gray-400">{TYPE_LABELS[q.type]}</span>
            {q.required && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                required
              </span>
            )}
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => moveQuestion(q._localId, "up")}
                disabled={idx === 0}
                className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(q._localId, "down")}
                disabled={idx === questions.length - 1}
                className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeQuestion(q._localId)}
                className="rounded p-1 text-red-400 hover:text-red-600"
                title="Delete question"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Expanded form */}
          {expandedId === q._localId && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700 space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Question text *
                </label>
                <input
                  value={q.title}
                  onChange={(e) => updateQuestion(q._localId, { title: e.target.value })}
                  placeholder="e.g. How would you rate the air quality?"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Name (slug) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Field name (auto-generated, must be unique)
                </label>
                <input
                  value={q.name}
                  onChange={(e) => updateQuestion(q._localId, { name: slugify(e.target.value) })}
                  placeholder="air_quality_rating"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 font-mono text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Question type
                </label>
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q._localId, { type: e.target.value as QuestionType })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Choices (select / multiselect) */}
              {(q.type === "select" || q.type === "multiselect") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Options
                  </label>
                  <div className="mt-1 space-y-1">
                    {(q.choices ?? []).map((choice, ci) => (
                      <div key={ci} className="flex gap-2">
                        <input
                          value={choice}
                          onChange={(e) => updateChoice(q._localId, ci, e.target.value)}
                          placeholder={`Option ${ci + 1}`}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeChoice(q._localId, ci)}
                          className="text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addChoice(q._localId)}
                      className="text-xs text-green-600 underline hover:text-green-700"
                    >
                      + Add option
                    </button>
                  </div>
                </div>
              )}

              {/* Min/Max (number / range) */}
              {(q.type === "number" || q.type === "range") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {q.type === "range" ? "Min rating" : "Min value"}
                    </label>
                    <input
                      type="number"
                      value={q.min ?? ""}
                      onChange={(e) => updateQuestion(q._localId, { min: parseFloat(e.target.value) || undefined })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {q.type === "range" ? "Max rating" : "Max value"}
                    </label>
                    <input
                      type="number"
                      value={q.max ?? ""}
                      onChange={(e) => updateQuestion(q._localId, { max: parseFloat(e.target.value) || undefined })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}

              {/* Placeholder (text) */}
              {q.type === "text" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Placeholder text
                  </label>
                  <input
                    value={q.placeholder ?? ""}
                    onChange={(e) => updateQuestion(q._localId, { placeholder: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              )}

              {/* Required toggle */}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => updateQuestion(q._localId, { required: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
              </label>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-600 dark:border-gray-600 dark:hover:border-green-600 transition-colors"
      >
        + Add question
      </button>
    </div>
  )
}
