import { NextApiRequest, NextApiResponse } from "next"
import {
  getUserCampaignAccessById,
  updateUserCampaignAccess,
  deleteUserCampaignAccess
} from "../../../controllers/UserCampaignAccessController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      try {
        const { id } = req.query
        const data = await getUserCampaignAccessById(String(id))
        if (!data) {
          return res.status(404).json({ error: "UserCampaignAccess not found" })
        } else {
          return res.status(200).json(data)
        }
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    case "PUT":
      try {
        const { id } = req.query
        const data = await updateUserCampaignAccess(String(id), req.body)
        return res.status(200).json(data)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    case "DELETE":
      try {
        const { id } = req.query
        await deleteUserCampaignAccess(String(id))
        return res.status(204)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
