import { NextApiRequest, NextApiResponse } from "next"
import {
  getAreaById,
  updateArea,
  deleteArea
} from "../../../controllers/AreaController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      try {
        const { id } = req.query
        const data = await getAreaById(String(id))
        if (!data) {
          res.status(404).json({ error: "Area not found" })
        } else {
          res.status(200).json(data)
        }
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
      break
    case "PUT":
      try {
        const { id } = req.query
        const data = await updateArea(String(id), req.body)
        res.status(200).json(data)
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
      break
    case "DELETE":
      try {
        const { id } = req.query
        await deleteArea(String(id))
        res.status(204).send()
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
      break
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"])
      res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
