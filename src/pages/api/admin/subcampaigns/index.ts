import { NextApiRequest, NextApiResponse } from "next"
import SubCampaignController from "@/controllers/admin/SubCampaignController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET": {
      try {
        const subCampaigns = await SubCampaignController.getAllSubCampaigns()
        return res.status(200).json(subCampaigns)
      } catch (error) {
        console.error("Error fetching sub-campaigns:", error)
        return res.status(500).json({ error: "Internal Server Error" })
      }
    }

    case "POST": {
      try {
        const newSubCampaign = await SubCampaignController.createSubCampaign(
          req.body
        )
        return res.status(201).json(newSubCampaign)
      } catch (error) {
        console.error("Error creating sub-campaign:", error)
        return res.status(500).json({ error: "Internal Server Error" })
      }
    }

    default: {
      res.setHeader("Allow", ["GET", "POST"])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  }
}
