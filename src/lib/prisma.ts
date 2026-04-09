import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Helper to get admin user ID for logging
 * In production, this should come from the authenticated session
 */
export async function getAdminUserId(): Promise<string> {
  // Try to find an admin user
  const admin = await prisma.user.findFirst({
    where: { role: "admin" }
  })

  if (admin) {
    return admin.id
  }

  // If no admin user exists, get the first user
  const firstUser = await prisma.user.findFirst()

  if (firstUser) {
    return firstUser.id
  }

  // Return a fallback UUID (shouldn't happen in practice)
  return "00000000-0000-0000-0000-000000000000"
}