import type { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET": {
        const campaigns = await CampaignController.getAllCampaigns()
        return res.status(200).json(campaigns)
      }

      case "POST": {
        console.log("--------------------req.body ")
        console.log("--------------------req.body ")
        console.log("--------------------req.body ")
        console.log("--------------------req.body ")
        console.log('-')
        console.log(req.body)
        const newCampaign = await CampaignController.createCampaign(req.body)
        return res.status(201).json(newCampaign)
      }

      default: {
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"])
        return res
          .status(405)
          .json({ error: `Method ${req.method} Not Allowed` })
      }
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
