import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class CampaignController {
  // Obtener todas las campañas
  static async getAllCampaigns() {
    return await prisma.campaign.findMany({
      include: {
        subCampaigns: {
          include: {
            tasks: {
              select: { id: true }
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
      }
    })
  }

  // Crear una nueva campaña
  static async createCampaign(data: any) {
    return await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        isOpen: data.isOpen,
        deadline: new Date(data.deadline),
        type: data.type,
        gameId: data.gameId
      }
    })
  }
}
