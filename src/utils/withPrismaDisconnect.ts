import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * Decorator to automatically disconnect from Prisma after a method is called.
 */
export function withPrismaDisconnect(
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>
): TypedPropertyDescriptor<any> {
  if (!descriptor || typeof descriptor.value !== "function") {
    throw new Error("withPrismaDisconnect can only be applied to methods.")
  }

  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    try {
      // Execute the original method
      return await originalMethod.apply(this, args)
    } catch (error) {
      throw error
    } finally {
      // Ensure Prisma disconnect is called
      await prisma.$disconnect()
    }
  }

  return descriptor
}

export { prisma }
