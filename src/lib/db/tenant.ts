/**
 * Baki (বাকি) - Tenant-Scoped Data Access Layer
 * Rule 1: Every business query MUST filter by shopId taken strictly from the authenticated session.
 * Rule 6: Soft delete (deletedAt: null) for business records.
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export function getTenantDb(shopId: string) {
  if (!shopId) {
    throw new Error("Tenant isolation violation: shopId is required and cannot be empty.");
  }

  return {
    shopId,

    // --------------------------------------------------
    // Customers
    // --------------------------------------------------
    customer: {
      findMany: <T extends Prisma.CustomerFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.CustomerFindManyArgs>
      ) => {
        return prisma.customer.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.CustomerFindManyArgs>);
      },
      findFirst: <T extends Prisma.CustomerFindFirstArgs>(
        args?: Prisma.SelectSubset<T, Prisma.CustomerFindFirstArgs>
      ) => {
        return prisma.customer.findFirst({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.CustomerFindFirstArgs>);
      },
      findUnique: (id: string, include?: Prisma.CustomerInclude) => {
        return prisma.customer.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        });
      },
      create: (data: Omit<Prisma.CustomerUncheckedCreateInput, "shopId" | "deletedAt">) => {
        return prisma.customer.create({
          data: {
            ...data,
            shopId,
          },
        });
      },
      update: (
        id: string,
        data: Prisma.CustomerUpdateInput,
        tx?: Prisma.TransactionClient
      ) => {
        const client = tx || prisma;
        return client.customer.updateMany({
          where: { id, shopId, deletedAt: null },
          data,
        });
      },
      softDelete: (id: string, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;
        return client.customer.updateMany({
          where: { id, shopId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      },
      count: (where: Prisma.CustomerWhereInput = {}) => {
        return prisma.customer.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Products
    // --------------------------------------------------
    product: {
      findMany: <T extends Prisma.ProductFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>
      ) => {
        return prisma.product.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>);
      },
      findFirst: <T extends Prisma.ProductFindFirstArgs>(
        args?: Prisma.SelectSubset<T, Prisma.ProductFindFirstArgs>
      ) => {
        return prisma.product.findFirst({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.ProductFindFirstArgs>);
      },
      findUnique: (id: string, include?: Prisma.ProductInclude) => {
        return prisma.product.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        });
      },
      create: (data: Omit<Prisma.ProductUncheckedCreateInput, "shopId" | "deletedAt">) => {
        return prisma.product.create({
          data: {
            ...data,
            shopId,
          },
        });
      },
      update: (
        id: string,
        data: Prisma.ProductUpdateInput,
        tx?: Prisma.TransactionClient
      ) => {
        const client = tx || prisma;
        return client.product.updateMany({
          where: { id, shopId, deletedAt: null },
          data,
        });
      },
      softDelete: (id: string, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;
        return client.product.updateMany({
          where: { id, shopId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      },
      count: (where: Prisma.ProductWhereInput = {}) => {
        return prisma.product.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Sales
    // --------------------------------------------------
    sale: {
      findMany: <T extends Prisma.SaleFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.SaleFindManyArgs>
      ) => {
        return prisma.sale.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.SaleFindManyArgs>);
      },
      findFirst: <T extends Prisma.SaleFindFirstArgs>(
        args?: Prisma.SelectSubset<T, Prisma.SaleFindFirstArgs>
      ) => {
        return prisma.sale.findFirst({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.SaleFindFirstArgs>);
      },
      findUnique: <T extends Prisma.SaleInclude>(id: string, include?: T) => {
        return prisma.sale.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        }) as unknown as Promise<Prisma.SaleGetPayload<{ include: T }> | null>;
      },
      softDelete: (id: string, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;
        return client.sale.updateMany({
          where: { id, shopId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      },
      count: (where: Prisma.SaleWhereInput = {}) => {
        return prisma.sale.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Ledger
    // --------------------------------------------------
    ledger: {
      findMany: <T extends Prisma.LedgerEntryFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.LedgerEntryFindManyArgs>
      ) => {
        return prisma.ledgerEntry.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.LedgerEntryFindManyArgs>);
      },
      count: (where: Prisma.LedgerEntryWhereInput = {}) => {
        return prisma.ledgerEntry.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Payments
    // --------------------------------------------------
    payment: {
      findMany: <T extends Prisma.PaymentFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.PaymentFindManyArgs>
      ) => {
        return prisma.payment.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.PaymentFindManyArgs>);
      },
      findUnique: (id: string, include?: Prisma.PaymentInclude) => {
        return prisma.payment.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        });
      },
      count: (where: Prisma.PaymentWhereInput = {}) => {
        return prisma.payment.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Stock Movements
    // --------------------------------------------------
    stockMovement: {
      findMany: <T extends Prisma.StockMovementFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.StockMovementFindManyArgs>
      ) => {
        return prisma.stockMovement.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.StockMovementFindManyArgs>);
      },
      count: (where: Prisma.StockMovementWhereInput = {}) => {
        return prisma.stockMovement.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Audit Logs
    // --------------------------------------------------
    auditLog: {
      findMany: <T extends Prisma.AuditLogFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.AuditLogFindManyArgs>
      ) => {
        return prisma.auditLog.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
          },
        } as unknown as Prisma.SelectSubset<T, Prisma.AuditLogFindManyArgs>);
      },
    },
  };
}
