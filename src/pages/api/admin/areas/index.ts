import { NextApiRequest, NextApiResponse } from "next"
import AreaController from "@/controllers/admin/AreaController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET": {
      try {
        const areas = await AreaController.getAllAreas()
        return res.status(200).json(areas)
      } catch (error) {
        console.error("Error fetching sub-campaigns:", error)
        return res.status(500).json({ error: "Internal Server Error" })
      }
    }

    case "POST": {
      try {
        const newArea = await AreaController.createArea(req.body)
        return res.status(201).json(newArea)
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
