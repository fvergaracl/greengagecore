import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class AreaController {
  static async getAllAreas() {
    return await prisma.area.findMany({
      where: { disabled: false },
      include: {
        pointOfInterests: {
          include: {
            tasks: {
              select: { id: true }
            }
          }
        },

        campaign: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }

  static async getAreaNames() {
    try {
      const areas = await prisma.area.findMany({
        select: {
          name: true
        }
      })

      return areas.map(area => area.name)
    } catch (error) {
      console.error("Error in getAreaNames:", error)
      throw new Error("Failed to fetch areas names")
    }
  }

  static async getAreaById(id: string) {
    return await prisma.area.findUnique({
      where: { id },
      include: {
        pointOfInterests: {
          include: {
            tasks: true
          }
        },
        campaign: {
          select: { id: true, name: true }
        }
      }
    })
  }

  static async createArea(data: any) {
    return await prisma.area.create({
      data: {
        name: data?.name,
        description: data?.description,
        isDisabled: false,
        campaignId: data?.campaignId,
        polygon: data?.polygon
      }
    })
  }

  static async updateArea(id: string, data: any) {
    return await prisma.area.update({
      where: { id },
      data: {
        name: data?.name,
        description: data?.description,
        isDisabled: data?.isDisabled,
        polygon: data?.polygon
      }
    })
  }
}
