import prisma from "../prismaClient"

export const getAllArea = async () => {
  return await prisma.area.findMany()
}

export const getAreaById = async (id: string) => {
  return await prisma.area.findUnique({ where: { id } })
}

export const createArea = async (data: any) => {
  return await prisma.area.create({ data })
}

export const updateArea = async (id: string, data: any) => {
  return await prisma.area.update({ where: { id }, data })
}

export const deleteArea = async (id: string) => {
  return await prisma.area.delete({ where: { id } })
}
