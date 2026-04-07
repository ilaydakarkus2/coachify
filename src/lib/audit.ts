import { prisma } from "./prisma"

export interface LogParams {
  entityType: string // "student", "mentor", "assignment", "payment"
  entityId: string
  action: string // "created", "updated", "deleted", "status_changed", "mentor_changed", "payment_processed"
  description: string
  userId: string
  studentId?: string
  metadata?: any
}

/**
 * Creates an audit log entry for tracking system actions
 */
export async function createLog(params: LogParams): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        description: params.description,
        userId: params.userId,
        studentId: params.studentId || null,
        metadata: params.metadata || null
      }
    })
  } catch (error) {
    console.error("Failed to create audit log:", error)
    // Don't throw - logs shouldn't break the main operation
  }
}

/**
 * Helper to get user ID from session for logging
 */
export function getUserIdFromSession(session: any): string {
  return session?.user?.id || ""
}
