"use client"

import { useActionState, useState } from "react"
import { createCampaign, type CampaignFormState } from "./actions"

export function NewCampaignForm() {
  const [state, formAction, isPending] = useActionState<CampaignFormState, FormData>(
    createCampaign,
    null
  )
  const [gameEnabled, setGameEnabled] = useState(false)

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {state.error}
        </div>
      )}

      <Field label="Name *" name="name" type="text" placeholder="Urban Heat Mapping" required />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Describe the campaign goal and methodology…"
        />
      </div>

      <Field label="Category *" name="category" type="text" placeholder="Environment" required />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date (optional)" name="startDatetime" type="datetime-local" />
        <Field label="End date (optional)" name="endDatetime" type="datetime-local" />
      </div>

      <div>
        <div className="flex items-center gap-3">
          <input
            id="gameEnabled"
            name="gameEnabled"
            type="checkbox"
            checked={gameEnabled}
            onChange={e => setGameEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="gameEnabled" className="text-sm text-gray-700 dark:text-gray-300">
            Enable gamification (GAME engine)
          </label>
        </div>
        {gameEnabled && (
          <div className="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Contributors will earn points and badges for their contributions. Rewards are
            processed automatically by the GAME engine after each approved contribution.
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create campaign"}
        </button>
        <a
          href="/dashboard/campaigns"
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
}: {
  label: string
  name: string
  type: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
    </div>
  )
}
