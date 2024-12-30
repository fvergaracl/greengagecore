import prisma from "../prismaClient"

export const getAllCampaign = async () => {
  return await prisma.campaign.findMany()
}

export const getCampaignById = async (id: string) => {
  return await prisma.campaign.findUnique({
    where: { id },
    include: {
      areas: {
        include: {
          pointOfInterests: {
            include: {
              tasks: true
            }
          }
        }
      }
    }
  })
}

export const createCampaign = async (data: any) => {
  return await prisma.campaign.create({ data })
}

export const updateCampaign = async (id: string, data: any) => {
  return await prisma.campaign.update({ where: { id }, data })
}

export const deleteCampaign = async (id: string) => {
  return await prisma.campaign.delete({ where: { id } })
}

// get all campaings , but that im in
export const getAllCampaignsByUserId = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        sub: userId
      },
      select: { id: true }
    })

    const campaigns = await prisma.campaign.findMany({
      where: {
        allowedUsers: {
          some: {
            userId: user.id
          }
        }
      }
    })
    return campaigns
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    throw error
  }
}
