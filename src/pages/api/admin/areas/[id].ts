import { NextApiRequest, NextApiResponse } from "next"
import AreaController from "@/controllers/admin/AreaController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    switch (req.method) {
      case "GET": {
        if (!id) {
          return res.status(400).json({ error: "Area ID is required" })
        }

        const area = await AreaController.getAreaById(id as string)

        if (!area) {
          return res.status(404).json({ error: "Area not found" })
        }

        return res.status(200).json(area)
      }

      case "PUT": {
        if (!id) {
          return res.status(400).json({ error: "Area ID is required" })
        }

        const updatedArea = await AreaController.updateArea(
          id as string,
          req.body
        )

        return res.status(200).json(updatedArea)
      }
      case "DELETE": {
        if (!id) {
          return res.status(400).json({ error: "Area ID is required" })
        }

        await AreaController.deleteArea(id as string)

        return res.status(204).end()
      }

      default: {
        res.setHeader("Allow", ["GET", "PUT", "DELETE"])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
      }
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
