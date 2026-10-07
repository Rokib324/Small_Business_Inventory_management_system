/**
 * Baki (বাকি) - Audit Logger
 * Rule 8: Every create, update, delete writes an AuditLog row.
 */

import { prisma } from "@/lib/db/prisma";
import { AuditAction, Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  shopId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}

export async function logAudit({
  shopId,
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
  tx,
}: CreateAuditLogParams) {
  const client = tx || prisma;

  return client.auditLog.create({
    data: {
      shopId,
      userId: userId || null,
      action,
      entityType,
      entityId,
      oldValues: oldValues ? (oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      newValues: newValues ? (newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
}
