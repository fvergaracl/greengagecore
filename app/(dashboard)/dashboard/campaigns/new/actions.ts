"use server"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export type CampaignFormState = { error: string } | null

function isValidTimezone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export async function createCampaign(
  _prev: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated. Please sign in again." }

  const name = (formData.get("name") as string)?.trim()
  const category = (formData.get("category") as string)?.trim()
  if (!name || !category) return { error: "Name and category are required." }

  const description = (formData.get("description") as string)?.trim() || null
  const startDatetime = formData.get("startDatetime") as string
  const endDatetime = formData.get("endDatetime") as string
  const timezoneRaw = (formData.get("timezone") as string)?.trim() || "UTC"
  if (!isValidTimezone(timezoneRaw)) {
    return { error: "Invalid timezone." }
  }
  const gameEnabled = formData.get("gameEnabled") === "on"

  let campaignId: string
  try {
    const campaign = await prisma.campaign.create({
      data: {
        researcherId: session.user.id,
        name,
        description,
        category,
        timezone: timezoneRaw,
        status: "draft",
        startDatetime: startDatetime ? new Date(startDatetime) : null,
        endDatetime: endDatetime ? new Date(endDatetime) : null,
        gameEnabled,
        gameStrategy: gameEnabled ? "greencrowdStrategy" : null,
      },
    })
    campaignId = campaign.id
  } catch (e) {
    console.error("Campaign creation error:", e)
    return { error: "Failed to create campaign. Please try again." }
  }

  redirect(`/dashboard/campaigns/${campaignId}`)
}
