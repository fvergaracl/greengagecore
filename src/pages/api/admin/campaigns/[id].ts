import { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"
import { formatToISO, formatFromISO } from "@/utils/dateTimeUtils"
import { isUUID } from "@/utils/isUUID"
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    switch (req.method) {
      case "GET": {
        if (!id) {
          return res.status(400).json({ error: "Campaign ID is required" })
        }

        const campaign = await CampaignController.getCampaignById(id as string)

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" })
        }

        let formattedStartDatetime = undefined
        if (campaign.startDatetime) {
          formattedStartDatetime = formatFromISO(campaign.startDatetime)
        }
        let formattedEndDatetime = undefined
        if (campaign.endDatetime) {
          formattedEndDatetime = formatFromISO(campaign.endDatetime)
        }

        const formattedCampaign = {
          ...campaign,
          startDatetime: formattedStartDatetime,
          endDatetime: formattedEndDatetime
        }
        console.log("--------------------------")
        console.log("-         GET            -")
        console.log("--------------------------")
        console.log({ formattedCampaign })
        return res.status(200).json(formattedCampaign)
      }

      case "PUT": {
        if (!id) {
          return res.status(400).json({ error: "Campaign ID is required" })
        }
        let formattedStartDatetime = undefined
        if (req?.body?.startDatetime) {
          formattedStartDatetime = formatToISO(req.body.startDatetime)
        }
        let formattedEndDatetime = undefined
        if (req?.body?.endDatetime) {
          formattedEndDatetime = formatToISO(req.body.endDatetime)
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

        const newCampaignData = {
          ...req.body,
          startDatetime: formattedStartDatetime,
          endDatetime: formattedEndDatetime
        }
        if (req?.body?.gameId && !isUUID(req?.body?.gameId)) {
          return res.status(400).json({ error: "Invalid game ID" })
        }
        const updatedCampaign = await CampaignController.updateCampaign(
          id as string,
          newCampaignData
        )

        return res.status(200).json(updatedCampaign)
      }
      default:
        res.setHeader("Allow", ["GET", "PUT"])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
