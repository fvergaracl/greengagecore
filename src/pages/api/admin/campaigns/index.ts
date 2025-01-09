import type { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"
import { formatToISO } from "@/utils/dateTimeUtils"

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
        const haveBothStartAndEndDatetime =
          formattedStartDatetime && formattedEndDatetime
        if (
          haveBothStartAndEndDatetime &&
          formattedStartDatetime > formattedEndDatetime
        ) {
          return res.status(400).json({
            error: "Start datetime cannot be greater than end datetime"
          })
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
