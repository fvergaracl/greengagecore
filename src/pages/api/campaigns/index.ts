import { NextApiRequest, NextApiResponse } from "next"
import {
  getAllCampaign,
  createCampaign,
  getAllCampaignsByUserId
} from "../../../controllers/CampaignController"
import { validateKeycloakToken } from "@/utils/validateToken" // Token validator

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      try {
        const { userId, userRoles } = await validateKeycloakToken(req)
        if (userRoles.includes("admin")) {
          const data = await getAllCampaign()
          res.status(200).json(data)
        }
        const data = await getAllCampaignsByUserId(userId)
        res.status(200).json(data)
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
      break
    case "POST":
      try {
        const data = await createCampaign(req.body)
        res.status(201).json(data)
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
      break
    default:
      res.setHeader("Allow", ["GET", "POST"])
      res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
