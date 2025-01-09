import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class POIController {
  static async getAllPOIs() {
    return await prisma.pointOfInterest.findMany({
      include: {
        area: {
          select: {
            id: true,
            name: true,
            polygon: true,
            campaign: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }

  static async getPOIById(id: string) {
    return await prisma.pointOfInterest.findUnique({
      where: { id },
      include: {
        area: {
          select: { id: true, name: true, polygon: true }
        },
        tasks: true
      }
    })
  }

  static async createPOI(data: any) {
    try {
      return await prisma.pointOfInterest.create({
        data: {
          name: data.name,
          description: data?.description,
          latitude: data?.latitude,
          longitude: data?.longitude,
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
          latitude: data?.latitude,
          longitude: data?.longitude,
          disabled: data?.disabled,
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
