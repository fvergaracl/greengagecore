import prisma from "../prismaClient"

export const getAllUser = async () => {
  return await prisma.user.findMany()
}

export const getUserBySub = async (sub: string) => {
  return await prisma.user.findFirst({ where: { sub } })
}
export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({ where: { id } })
}

export const createUser = async (data: any) => {
  return await prisma.user.create({ data })
}

export const updateUser = async (id: string, data: any) => {
  return await prisma.user.update({ where: { id }, data })
}

export const deleteUser = async (id: string) => {
  return await prisma.user.delete({ where: { id } })
}
