import type { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"

const formatToISO = (datetime: string): string => {
  const date = new Date(datetime)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${datetime}`)
  }
  return date.toISOString() // Devuelve en formato ISO-8601
}

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
  
        let formattedStartDatetime = undefined
        if (req?.body?.startDatetime) {
          formattedStartDatetime = formatToISO(req.body.startDatetime)
        }
        let formattedEndDatetime = undefined
        if (req?.body?.endDatetime) {
          formattedEndDatetime = formatToISO(req.body.endDatetime)
        }
        const newCampaignData = {
          ...req.body,
          startDatetime: formattedStartDatetime,
          endDatetime: formattedEndDatetime
        }

        const newCampaign =
          await CampaignController.createCampaign(newCampaignData)
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
