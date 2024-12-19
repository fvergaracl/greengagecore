import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class SubCampaignController {
  static async getAllSubCampaigns() {
    return await prisma.subCampaign.findMany({
      where: { disabled: false },
      include: {
        tasks: {
          select: { id: true }
        },
        campaign: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    })
  }

  static async getSubCampaignNames() {
    try {
      const subCampaigns = await prisma.subCampaign.findMany({
        select: {
          name: true
        }
      })

      return subCampaigns.map(subCampaign => subCampaign.name)
    } catch (error) {
      console.error("Error in getSubCampaignNames:", error)
      throw new Error("Failed to fetch sub-campaign names")
    }
  }

  static async getSubCampaignById(id: string) {
    return await prisma.subCampaign.findUnique({
      where: { id },
      include: {
        tasks: true,
        campaign: {
          select: { id: true, name: true }
        }
      }
    })
  }

  static async createSubCampaign(data: any) {
    return await prisma.subCampaign.create({
      data: {
        name: data?.name,
        description: data?.description,
        disabled: false, 
        campaignId: data?.campaignId,
        polygon: data?.polygon
      }
    })
  }

  static async updateSubCampaign(id: string, data: any) {
    return await prisma.subCampaign.update({
      where: { id },
      data: {
        name: data?.name,
        description: data?.description,
        disabled: data?.disabled,
        polygon: data?.polygon
      }
    })
  }
}
