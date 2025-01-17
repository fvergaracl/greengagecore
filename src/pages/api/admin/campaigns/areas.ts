import { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const campaignNames =
        await CampaignController.getCampaignNamesWithPolygons()
      return res.status(200).json(campaignNames)
    } catch (error) {
      console.error("Error fetching campaign names:", error)
      return res.status(500).json({ error: "Internal Server Error" })
    }
  } else {
    res.setHeader("Allow", ["GET"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
