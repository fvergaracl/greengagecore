import { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/CampaignController"
import { validateKeycloakToken } from "@/utils/validateToken" // Token validator

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET": {
        const { userId } = await validateKeycloakToken(req)

        const userCampaigns =
          await CampaignController.getAllCampaignsAllowedByUserId(userId)
        return res.status(200).json(userCampaigns)
      }

      case "POST": {
        const createdCampaign = await CampaignController.createCampaign(
          req.body
        )
        return res.status(201).json(createdCampaign)
      }

      default:
        res.setHeader("Allow", ["GET", "POST"])
        return res
          .status(405)
          .end(`Method ${req.method} is not allowed on this endpoint.`)
    }
  } catch (err: any) {
    console.error("API Error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}
