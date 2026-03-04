// Dashboard — Create campaign form (Server Component + Server Action).

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "New Campaign — GreenCrowd" }

async function createCampaign(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const category = formData.get("category") as string
  const startDatetime = formData.get("startDatetime") as string
  const endDatetime = formData.get("endDatetime") as string
  const gameEnabled = formData.get("gameEnabled") === "on"

  if (!name || !category) return

  const campaign = await prisma.campaign.create({
    data: {
      researcherId: session.user.id,
      name: name.trim(),
      description: description?.trim() || null,
      category: category.trim(),
      status: "draft",
      startDatetime: startDatetime ? new Date(startDatetime) : null,
      endDatetime: endDatetime ? new Date(endDatetime) : null,
      gameEnabled,
      gameStrategy: gameEnabled ? "greencrowdStrategy" : null,
    },
  })

  redirect(`/dashboard/campaigns/${campaign.id}`)
}

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        New Campaign
      </h1>

      <form action={createCampaign} className="space-y-5">
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
          <Field label="Start date" name="startDatetime" type="datetime-local" />
          <Field label="End date" name="endDatetime" type="datetime-local" />
        </div>
        <div className="flex items-center gap-3">
          <input
            id="gameEnabled"
            name="gameEnabled"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="gameEnabled" className="text-sm text-gray-700 dark:text-gray-300">
            Enable gamification (GAME engine)
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Create campaign
          </button>
          <a
            href="/dashboard/campaigns"
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
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
