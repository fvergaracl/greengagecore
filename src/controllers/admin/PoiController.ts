import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class POIController {
  static async getAllPOIs() {
    return await prisma.pointOfInterest.findMany({
      include: {
        area: {
          select: { id: true, name: true }
        },
        tasks: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    })
  }

  static async getPOIById(id: string) {
    return await prisma.pointOfInterest.findUnique({
      where: { id },
      include: {
        area: {
          select: { id: true, name: true }
        },
        tasks: true
      }
    })
  }

  static async createPOI(data: any) {
    try {
      return await prisma.pointOfInterest.create({
        data: {
          name: data?.name,
          description: data?.description,
          location: {
            set: data?.location // Assumes a GeoJSON or array format for the location
          },
          radius: data?.radius,
          areaId: data?.areaId
        }
      })
    } catch (error) {
      console.error("Error in createPOI:", error)
      throw new Error("Failed to create point of interest.")
    }
  }

  static async updatePOI(id: string, data: any) {
    try {
      return await prisma.pointOfInterest.update({
        where: { id },
        data: {
          name: data?.name,
          description: data?.description,
          location: {
            set: data?.location // Update location
          },
          radius: data?.radius,
          areaId: data?.areaId
        }
      })
    } catch (error) {
      console.error("Error in updatePOI:", error)
      throw new Error("Failed to update point of interest.")
    }
  }

  static async deletePOI(id: string) {
    try {
      return await prisma.pointOfInterest.delete({
        where: { id }
      })
    } catch (error) {
      console.error("Error in deletePOI:", error)
      throw new Error("Failed to delete point of interest.")
    }
  }
}
