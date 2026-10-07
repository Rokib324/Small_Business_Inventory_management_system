/**
 * Baki (বাকি) - Tenant-Scoped Data Access Layer
 * Rule 1: Every business query MUST filter by shopId taken strictly from the authenticated session.
 * Rule 6: Soft delete (deletedAt: null) for business records.
 * Models: Customer, Product, Sale, LedgerEntry, Payment, StockMovement, Supplier, Purchase, AuditLog.
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
        } as unknown as Prisma.CustomerFindManyArgs) as unknown as Promise<
          Array<Prisma.CustomerGetPayload<T>>
        >;
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
        } as unknown as Prisma.CustomerFindFirstArgs) as unknown as Promise<
          Prisma.CustomerGetPayload<T> | null
        >;
      },
      findUnique: <T extends Prisma.CustomerInclude>(id: string, include?: T) => {
        return prisma.customer.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        }) as unknown as Promise<Prisma.CustomerGetPayload<{ include: T }> | null>;
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
        } as unknown as Prisma.ProductFindManyArgs) as unknown as Promise<
          Array<Prisma.ProductGetPayload<T>>
        >;
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
        } as unknown as Prisma.ProductFindFirstArgs) as unknown as Promise<
          Prisma.ProductGetPayload<T> | null
        >;
      },
      findUnique: <T extends Prisma.ProductInclude>(id: string, include?: T) => {
        return prisma.product.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        }) as unknown as Promise<Prisma.ProductGetPayload<{ include: T }> | null>;
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
        } as unknown as Prisma.SaleFindManyArgs) as unknown as Promise<
          Array<Prisma.SaleGetPayload<T>>
        >;
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
        } as unknown as Prisma.SaleFindFirstArgs) as unknown as Promise<
          Prisma.SaleGetPayload<T> | null
        >;
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
      aggregate: <T extends Prisma.SaleAggregateArgs>(
        args: Prisma.Subset<T, Prisma.SaleAggregateArgs>
      ) => {
        return prisma.sale.aggregate({
          ...args,
          where: {
            ...args.where,
            shopId,
            deletedAt: null,
          },
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
        } as unknown as Prisma.LedgerEntryFindManyArgs) as unknown as Promise<
          Array<Prisma.LedgerEntryGetPayload<T>>
        >;
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
        } as unknown as Prisma.PaymentFindManyArgs) as unknown as Promise<
          Array<Prisma.PaymentGetPayload<T>>
        >;
      },
      findUnique: <T extends Prisma.PaymentInclude>(id: string, include?: T) => {
        return prisma.payment.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        }) as unknown as Promise<Prisma.PaymentGetPayload<{ include: T }> | null>;
      },
      count: (where: Prisma.PaymentWhereInput = {}) => {
        return prisma.payment.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
      aggregate: <T extends Prisma.PaymentAggregateArgs>(
        args: Prisma.Subset<T, Prisma.PaymentAggregateArgs>
      ) => {
        return prisma.payment.aggregate({
          ...args,
          where: {
            ...args.where,
            shopId,
            deletedAt: null,
          },
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
        } as unknown as Prisma.StockMovementFindManyArgs) as unknown as Promise<
          Array<Prisma.StockMovementGetPayload<T>>
        >;
      },
      count: (where: Prisma.StockMovementWhereInput = {}) => {
        return prisma.stockMovement.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // Suppliers
    // --------------------------------------------------
    supplier: {
      findMany: <T extends Prisma.SupplierFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.SupplierFindManyArgs>
      ) => {
        return prisma.supplier.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SupplierFindManyArgs) as unknown as Promise<
          Array<Prisma.SupplierGetPayload<T>>
        >;
      },
      findFirst: <T extends Prisma.SupplierFindFirstArgs>(
        args?: Prisma.SelectSubset<T, Prisma.SupplierFindFirstArgs>
      ) => {
        return prisma.supplier.findFirst({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.SupplierFindFirstArgs) as unknown as Promise<
          Prisma.SupplierGetPayload<T> | null
        >;
      },
      findUnique: <T extends Prisma.SupplierInclude>(id: string, include?: T) => {
        return prisma.supplier.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        }) as unknown as Promise<Prisma.SupplierGetPayload<{ include: T }> | null>;
      },
      create: (data: Omit<Prisma.SupplierUncheckedCreateInput, "shopId" | "deletedAt">) => {
        return prisma.supplier.create({
          data: {
            ...data,
            shopId,
          },
        });
      },
      update: (
        id: string,
        data: Prisma.SupplierUpdateInput,
        tx?: Prisma.TransactionClient
      ) => {
        const client = tx || prisma;
        return client.supplier.updateMany({
          where: { id, shopId, deletedAt: null },
          data,
        });
      },
      softDelete: (id: string, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;
        return client.supplier.updateMany({
          where: { id, shopId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      },
      count: (where: Prisma.SupplierWhereInput = {}) => {
        return prisma.supplier.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
    },

    // --------------------------------------------------
    // --------------------------------------------------
    // Purchases
    // --------------------------------------------------
    purchase: {
      findMany: <T extends Prisma.PurchaseFindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.PurchaseFindManyArgs>
      ) => {
        return prisma.purchase.findMany({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.PurchaseFindManyArgs) as unknown as Promise<
          Array<Prisma.PurchaseGetPayload<T>>
        >;
      },
      findFirst: <T extends Prisma.PurchaseFindFirstArgs>(
        args?: Prisma.SelectSubset<T, Prisma.PurchaseFindFirstArgs>
      ) => {
        return prisma.purchase.findFirst({
          ...(args as object),
          where: {
            ...((args?.where || {}) as object),
            shopId,
            deletedAt: null,
          },
        } as unknown as Prisma.PurchaseFindFirstArgs) as unknown as Promise<
          Prisma.PurchaseGetPayload<T> | null
        >;
      },
      findUnique: <T extends Prisma.PurchaseInclude>(id: string, include?: T) => {
        return prisma.purchase.findFirst({
          where: {
            id,
            shopId,
            deletedAt: null,
          },
          include,
        }) as unknown as Promise<Prisma.PurchaseGetPayload<{ include: T }> | null>;
      },
      softDelete: (id: string, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;
        return client.purchase.updateMany({
          where: { id, shopId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      },
      count: (where: Prisma.PurchaseWhereInput = {}) => {
        return prisma.purchase.count({
          where: { ...where, shopId, deletedAt: null },
        });
      },
      aggregate: <T extends Prisma.PurchaseAggregateArgs>(
        args: Prisma.Subset<T, Prisma.PurchaseAggregateArgs>
      ) => {
        return prisma.purchase.aggregate({
          ...args,
          where: {
            ...args.where,
            shopId,
            deletedAt: null,
          },
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
        } as unknown as Prisma.AuditLogFindManyArgs) as unknown as Promise<
          Array<Prisma.AuditLogGetPayload<T>>
        >;
      },
    },
  };
}
