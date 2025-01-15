import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"

export default class POIController {
  @withPrismaDisconnect
  static async getAllPOIs() {
    return await prisma.pointOfInterest.findMany({
      where: {
        isDisabled: false,
        area: {
          isDisabled: false,
          campaign: {
            isDisabled: false
          }
        }
      },
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

  @withPrismaDisconnect
  static async getPOIById(id: string) {
    return await prisma.pointOfInterest.findUnique({
      where: {
        id,
        isDisabled: false,
        area: {
          isDisabled: false,
          campaign: {
            isDisabled: false
          }
        }
      },
      include: {
        area: {
          select: {
            id: true,
            name: true,
            polygon: true
          }
        },
        tasks: {
          where: { isDisabled: false }
        }
      }
    })
  }
  @withPrismaDisconnect
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
  @withPrismaDisconnect
  static async updatePOI(id: string, data: any) {
    try {
      return await prisma.pointOfInterest.update({
        where: { id },
        data: {
          name: data?.name,
          description: data?.description,
          latitude: data?.latitude,
          longitude: data?.longitude,
          isDisabled: data?.isDisabled,
          radius: data?.radius,
          areaId: data?.areaId
        }
      })
    } catch (error) {
      console.error("Error in updatePOI:", error)
      throw new Error("Failed to update point of interest.")
    }
  }
  @withPrismaDisconnect
  static async deletePOI(id: string) {
    try {
      return await prisma.pointOfInterest.update({
        where: { id },
        data: { isDisabled: true }
      })
    } catch (error) {
      console.error("Error in deletePOI:", error)
      throw new Error("Failed to delete point of interest.")
    }
  }
}
