// GreenCrowd V2 — User synchronization from Keycloak
// On first login, creates the local record in users with the Keycloak sub.
// Personal data (name, email) is stored ONLY in Keycloak.

import { prisma } from "@/lib/db"

/**
 * Gets or creates the local user from the Keycloak sub.
 * Called in the NextAuth jwt callback.
 */
export async function upsertUserFromKeycloak(sub: string): Promise<{ id: string; sub: string }> {
  const user = await prisma.user.upsert({
    where: { sub },
    create: {
      sub,
      settings: {
        create: {
          language: "en",
          theme: "light",
          timezone: "UTC",
          notificationsEnabled: true,
        },
      },
    },
    update: {}, // Do not update anything if already exists
    select: { id: true, sub: true },
  })
  return user
}

/**
 * Gets the local user by Keycloak sub.
 * Throws an error if not found (should have been created during upsert).
 */
export async function getUserBySub(sub: string) {
  return prisma.user.findUniqueOrThrow({
    where: { sub },
    include: { settings: true },
  })
}

/**
 * Marks a user as disabled (soft delete).
 * Contribution data will be anonymized during the GDPR delete process.
 */
export async function disableUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isDisabled: true },
  })
}

/**
 * Anonymizes user data to comply with GDPR delete.
 * - Deletes the users record (cascades to settings, subscriptions)
 * - Contributions remain with user_id = NULL (anonymized)
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Anonymize contributions (set user_id to null)
    await tx.$executeRaw`
      UPDATE contributions SET user_id = NULL WHERE user_id = ${userId}::uuid
    `
    // Anonymize reward events
    await tx.$executeRaw`
      UPDATE reward_events SET user_id = NULL WHERE user_id = ${userId}::uuid
    `
    // Anonymize audit logs
    await tx.$executeRaw`
      UPDATE audit_logs SET actor_id = NULL WHERE actor_id = ${userId}::uuid
    `
    // Delete the user (cascades: settings, subscriptions, wallet, access)
    await tx.user.delete({ where: { id: userId } })
  })
}
