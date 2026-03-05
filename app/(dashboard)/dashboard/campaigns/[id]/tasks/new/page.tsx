// Dashboard — Create task for an Area or POI in a campaign.
// Server Action: validates ownership, creates task via Prisma.

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

export const metadata = { title: "New Task — GreenCrowd" }

async function createTask(campaignId: string, formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim()
  const type = formData.get("type") as string
  const areaId = formData.get("areaId") as string
  const requiresPhoto = formData.get("requiresPhoto") === "on"
  const requiresSurvey = formData.get("requiresSurvey") === "on"
  const responseLimit = formData.get("responseLimit")
    ? Number(formData.get("responseLimit"))
    : null
  const closureMode = (formData.get("closureMode") as string) || "unlimited"

  if (!title || !type || !areaId) return

  const area = await prisma.area.findFirst({
    where: { id: areaId, campaignId, campaign: { researcherId: session.user.id } },
  })
  if (!area) redirect(`/dashboard/campaigns/${campaignId}`)

  await prisma.task.create({
    data: {
      areaId,
      title,
      description: description || null,
      type: type as "photo" | "survey" | "mixed" | "instruction",
      taskData: {},
      requiresPhoto,
      requiresSurvey,
      responseLimit,
      closureMode: closureMode as "single" | "threshold" | "unlimited",
    },
  })

  redirect(`/dashboard/campaigns/${campaignId}`)
}

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const campaign = await prisma.campaign.findFirst({
    where: { id, researcherId: session!.user!.id! },
    include: {
      areas: { select: { id: true, name: true } },
    },
  })
  if (!campaign) notFound()

  const action = createTask.bind(null, id)

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
          { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
          { href: `/dashboard/campaigns/${id}`, label: campaign.name, emoji: "📢" },
          { label: "New task", emoji: "🧩" },
        ]}
      />
      <h1 className="mb-6 mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        🧩 New Task
      </h1>

      {campaign.areas.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          <p className="font-medium">No areas yet</p>
          <p className="mt-1">
            Tasks must be attached to an Area. Create at least one area via the
            API before adding tasks.
          </p>
        </div>
      ) : (
        <form action={action} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Area *
            </label>
            <select
              name="areaId"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Select an area…</option>
              {campaign.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title *
            </label>
            <input
              name="title"
              type="text"
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
              name="description"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type *
            </label>
            <select
              name="type"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="photo">Photo</option>
              <option value="survey">Survey</option>
              <option value="mixed">Mixed (photo + survey)</option>
              <option value="instruction">Instruction</option>
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input name="requiresPhoto" type="checkbox" className="rounded" />
              Requires photo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input name="requiresSurvey" type="checkbox" className="rounded" />
              Requires survey
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Response limit per user
              </label>
              <input
                name="responseLimit"
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
                name="closureMode"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="unlimited">Unlimited</option>
                <option value="single">Single response</option>
                <option value="threshold">Threshold</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Create task
            </button>
            <Link
              href={`/dashboard/campaigns/${id}`}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
