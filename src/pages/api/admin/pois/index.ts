import { NextApiRequest, NextApiResponse } from "next"
import PoiController from "@/controllers/admin/PoiController"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET": {
        try {
          const pois = await PoiController.getAllPOIs()
          return res.status(200).json(pois)
        } catch (error) {
          console.error("Error fetching POIs:", error)
          return res.status(500).json({ error: "Internal Server Error" })
        }
      }

      case "POST": {
        try {
          const newPOI = await PoiController.createPOI(req.body)
          return res.status(201).json(newPOI)
        } catch (error) {
          console.error("Error creating POI:", error)
          return res.status(500).json({ error: "Internal Server Error" })
        }
      }

      default: {
        res.setHeader("Allow", ["GET", "POST"])
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
