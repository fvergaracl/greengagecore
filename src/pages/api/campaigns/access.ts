import { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/prismaClient"
import { validateKeycloakToken } from "@/utils/validateToken" // Reusable token validator

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { userId } = await validateKeycloakToken(req, res)

    let user = await prisma.user.findUnique({
      where: { sub: userId }
    })

    if (!user) {
      user = await prisma.user.create({
        data: { sub: userId }
      })
      console.log("New user created:", user)
    }

    const { campaignId } = req.body

    if (!campaignId) {
      return res
        .status(400)
        .json({ error: "Missing required fields: campaignId or accessType" })
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" })
    }

    const existingAccess = await prisma.userCampaignAccess.findFirst({
      where: {
        userId: user?.id, // Use the database's UUID for the user
        campaignId
      }
    })

    if (existingAccess) {
      return res.status(409).json({
        error: "User already has access to this campaign"
      })
    }

    const userAccess = await prisma.userCampaignAccess.upsert({
      where: { userId_campaignId: { userId: user.id, campaignId } },
      update: { accessType: "participant" },
      create: {
        userId: user.id,
        campaignId,
        accessType: "participant"
      }
    })

    // Return success response
    return res.status(201).json({
      message: "Campaign access successfully registered",
      data: userAccess
    })
  } catch (error: any) {
    console.error("Error processing campaign access:", error.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}
