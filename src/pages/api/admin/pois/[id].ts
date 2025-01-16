import { NextApiRequest, NextApiResponse } from "next"
import PoiController from "@/controllers/admin/PoiController"
import AreaController from "@/controllers/admin/AreaController"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    switch (req.method) {
      case "GET": {
        if (!id) {
          return res.status(400).json({ error: "POI ID is required" })
        }

        const poi = await PoiController.getPOIById(id as string)

        if (!poi) {
          return res.status(404).json({ error: "POI not found" })
        }

        return res.status(200).json(poi)
      }

      case "PUT": {
        if (!id) {
          return res.status(400).json({ error: "POI ID is required" })
        }
        if (!req.body.areaId) {
          return res.status(400).json({ error: "Area ID is required" })
        }
        const area = await AreaController.getAreaById(req.body.areaId)
        if (!area) {
          return res.status(404).json({ error: "Area not found" })
        }
        if (area?.isDisabled) {
          return res
            .status(404)
            .json({ error: "Area is disabled and/or cannot have POIs" })
        }
        if (area?.polygon && area?.polygon?.length < 3) {
          return res
            .status(404)
            .json({ error: "Area does not have a valid polygon" })
        }

        const isInsidePolygon = require("point-in-polygon")

        if (
          !isInsidePolygon(
            [req.body.latitude, req.body.longitude],
            area.polygon
          )
        ) {
          return res
            .status(404)
            .json({ error: "POI is not inside the area polygon" })
        }

        const updatedPOI = await PoiController.updatePOI(id as string, req.body)

        return res.status(200).json(updatedPOI)
      }

      case "DELETE": {
        if (!id) {
          return res.status(400).json({ error: "POI ID is required" })
        }

        await PoiController.deletePOI(id as string)

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
  } finally {
    await prisma.$disconnect()
  }
}
