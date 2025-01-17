// import prisma from "../prismaClient"

// export const getAllUser = async () => {
//   return await prisma.user.findMany()
// }

// export const getUserBySub = async (sub: string) => {
//   return await prisma.user.findFirst({ where: { sub } })
// }
// export const getUserById = async (id: string) => {
//   return await prisma.user.findUnique({ where: { id } })
// }

// export const createUser = async (data: any) => {
//   return await prisma.user.create({ data })
// }

// export const updateUser = async (id: string, data: any) => {
//   return await prisma.user.update({ where: { id }, data })
// }

// export const deleteUser = async (id: string) => {
//   return await prisma.user.delete({ where: { id } })
// }

import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"
export default class UserController {
  @withPrismaDisconnect
  static async getAllUser() {
    return prisma.user.findMany()
  }

  @withPrismaDisconnect
  static async getUserBySub(sub: string) {
    return prisma.user.findFirst({ where: { sub } })
  }

  @withPrismaDisconnect
  static async getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  @withPrismaDisconnect
  static async createUser(data: any) {
    return prisma.user.create({ data })
  }

  @withPrismaDisconnect
  static async updateUser(id: string, data: any) {
    return prisma.user.update({ where: { id }, data })
  }

  @withPrismaDisconnect
  static async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } })
  }
}
