import { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    switch (req.method) {
      case "GET":
        if (!id) {
          return res.status(400).json({ error: "Campaign ID is required" })
        }

        const campaign = await CampaignController.getCampaignById(id as string)

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" })
        }

        return res.status(200).json(campaign)

      case "PUT":
        if (!id) {
          return res.status(400).json({ error: "Campaign ID is required" })
        }

        const updatedCampaign = await CampaignController.updateCampaign(
          id as string,
          req.body
        )

        return res.status(200).json(updatedCampaign)
      default:
        res.setHeader("Allow", ["GET", "PUT"])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
