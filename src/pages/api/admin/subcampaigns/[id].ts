import { NextApiRequest, NextApiResponse } from "next"
import SubCampaignController from "@/controllers/admin/SubCampaignController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    switch (req.method) {
      case "GET": {
        if (!id) {
          return res.status(400).json({ error: "SubCampaign ID is required" })
        }

        const subCampaign = await SubCampaignController.getSubCampaignById(
          id as string
        )

        if (!subCampaign) {
          return res.status(404).json({ error: "SubCampaign not found" })
        }

        return res.status(200).json(subCampaign)
      }

      case "PUT": {
        if (!id) {
          return res.status(400).json({ error: "SubCampaign ID is required" })
        }

        const updatedSubCampaign =
          await SubCampaignController.updateSubCampaign(id as string, req.body)

        return res.status(200).json(updatedSubCampaign)
      }

      default: {
        res.setHeader("Allow", ["GET", "PUT"])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
      }
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
