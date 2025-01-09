import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"
import { Prisma } from "@prisma/client"

export default class CampaignControllerCommon {
  @withPrismaDisconnect
  static async getAllCampaigns() {
    return await prisma.campaign.findMany({
      where: { disabled: false }, // Opcional: Filtrar campañas activas si es necesario
      include: {
        areas: {
          include: {
            pointOfInterests: {
              include: {
                tasks: {
                  select: { id: true }
                }
              }
            }
          }
        },
        allowedUsers: {
          include: {
            user: {
              select: { id: true, sub: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }

  @withPrismaDisconnect
  static async getCampaignById(id: string) {
    return await prisma.campaign.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            pointOfInterests: {
              include: {
                tasks: {
                  select: { id: true }
                }
              }
            }
          }
        },
        allowedUsers: true
      }
    })
  }

  @withPrismaDisconnect
  static async createCampaign(data: Prisma.CampaignCreateInput) {
    // Filtrar valores undefined
    const filteredData: Prisma.CampaignCreateInput = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value !== undefined ? value : null
      ])
    ) as Prisma.CampaignCreateInput

    return await prisma.campaign.create({
      data: filteredData
    })
  }

  @withPrismaDisconnect
  static async updateCampaign(id: string, data: Prisma.CampaignUpdateInput) {
    // Filtrar valores undefined
    const filteredData: Prisma.CampaignUpdateInput = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value !== undefined ? value : null
      ])
    ) as Prisma.CampaignUpdateInput

    return await prisma.campaign.update({
      where: { id },
      data: filteredData
    })
  }

  @withPrismaDisconnect
  static async deleteCampaign(id: string) {
    return await prisma.campaign.delete({
      where: { id }
    })
  }

  @withPrismaDisconnect
  static async getAllCampaignsByUserId(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { sub: userId },
        select: { id: true }
      })

      if (!user) {
        throw new Error(`User with ID ${userId} not found.`)
      }

      return await prisma.campaign.findMany({
        where: {
          allowedUsers: {
            some: { userId: user.id }
          }
        },
        include: {
          areas: {
            include: {
              pointOfInterests: true
            }
          },
          allowedUsers: true
        }
      })
    } catch (error) {
      console.error("Error fetching campaigns by user ID:", error)
      throw error
    }
  }
  // get all campaings allowed to see and include the campaign that the user is in

  @withPrismaDisconnect
  static async getAllCampaignsAllowedByUserId(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { sub: userId },
        select: { id: true }
      })

      if (!user) {
        throw new Error(`User with ID ${userId} not found.`)
      }

      return await prisma.campaign.findMany({
        where: {
          OR: [
            {
              allowedUsers: {
                some: { userId: user.id }
              }
            },
            {
              userId: user.id
            }
          ]
        },
        include: {
          areas: {
            include: {
              pointOfInterests: true
            }
          },
          allowedUsers: true
        }
      })
    } catch (error) {
      console.error("Error fetching campaigns by user ID:", error)
      throw error
    }
  }

  @withPrismaDisconnect
  static async getCampaignNames() {
    return await prisma.campaign.findMany({
      select: {
        id: true,
        name: true
      }
    })
  }
}
