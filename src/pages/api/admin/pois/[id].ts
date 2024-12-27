import { NextApiRequest, NextApiResponse } from "next"
import PoiController from "@/controllers/admin/PoiController"
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

        const updatedPOI = await PoiController.updatePOI(id as string, req.body)

        return res.status(200).json(updatedPOI)
      }

      default: {
        res.setHeader("Allow", ["GET", "PUT"])
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
