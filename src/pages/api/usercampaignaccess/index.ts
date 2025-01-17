import { NextApiRequest, NextApiResponse } from "next"
import {
  getAllUserCampaignAccess,
  createUserCampaignAccess
} from "../../../controllers/UserCampaignAccessController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      try {
        const data = await getAllUserCampaignAccess()
        return res.status(200).json(data)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    case "POST":
      try {
        const data = await createUserCampaignAccess(req.body)
        return res.status(201).json(data)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    default:
      res.setHeader("Allow", ["GET", "POST"])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
