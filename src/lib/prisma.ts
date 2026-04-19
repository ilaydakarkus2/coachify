import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

// Production'da da singleton koru (hot-reload yok ama serverless function reuse icin)
globalForPrisma.prisma = prisma

// Admin user ID cache - her API cagrisinda DB sorgusu yapmamak icin
let cachedAdminUserId: string | null = null
let cachedAt = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 dakika

/**
 * Admin user ID'sini dondurur. In-memory cache ile DB sorgusunu azaltir.
 * Cache gecersiz olma ihtimaline karsi (user silinmesi vs) fallback mekanizmasi var.
 */
export async function getAdminUserId(): Promise<string> {
  const now = Date.now()
  if (cachedAdminUserId && (now - cachedAt) < CACHE_TTL) {
    // Cache'in hala gecerli olup olmadigini kontrol et
    const exists = await prisma.user.findUnique({
      where: { id: cachedAdminUserId }
    })
    if (exists) return cachedAdminUserId
    // Cache stale — temizle
    cachedAdminUserId = null
    cachedAt = 0
  }

  const admin = await prisma.user.findFirst({
    where: { role: "admin" }
  })

  if (admin) {
    cachedAdminUserId = admin.id
    cachedAt = now
    return admin.id
  }

  const firstUser = await prisma.user.findFirst()
  if (firstUser) {
    cachedAdminUserId = firstUser.id
    cachedAt = now
    return firstUser.id
  }

  return "00000000-0000-0000-0000-000000000000"
}
