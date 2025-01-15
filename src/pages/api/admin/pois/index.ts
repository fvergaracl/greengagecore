import { NextApiRequest, NextApiResponse } from "next"
import PoiController from "@/controllers/admin/PoiController"
import AreaController from "@/controllers/admin/AreaController"
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
          console.log("-----------------------------")
          console.log("-----------------------------")
          console.log("-----------------------------")
          console.log("-----------------------------")
          console.log(req.body)
          console.log("*****************************")
          console.log("*****************************")
          console.log("*****************************")
          console.log("*****************************")
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

          console.log("-----------------------------222222222222222")
          console.log(area)
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
