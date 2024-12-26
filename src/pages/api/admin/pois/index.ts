import { NextApiRequest, NextApiResponse } from "next"
import PoiController from "@/controllers/admin/PoiController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET": {
      try {
        const areas = await PoiController.getAllPois()
        return res.status(200).json(areas)
      } catch (error) {
        console.error("Error fetching areas:", error)
        return res.status(500).json({ error: "Internal Server Error" })
      }
    }

    case "POST": {
      try {
        const newArea = await PoiController.creatE
        return res.status(201).json(newArea)
      } catch (error) {
        console.error("Error creating area:", error)
        return res.status(500).json({ error: "Internal Server Error" })
      }
    }

    default: {
      res.setHeader("Allow", ["GET", "POST"])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  }
}
