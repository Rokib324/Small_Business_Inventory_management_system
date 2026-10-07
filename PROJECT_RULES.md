# Baki (বাকি) - Project Rules & Architecture Standards

> Bangla-first billing, stock, and due-ledger web app for small retail & wholesale shops in Bangladesh (starting with hardware stores).

---

## 1. Non-Negotiable Core Rules

### Rule 1: Multi-Tenancy by Design
- **Every business table MUST have a `shopId` column.**
- **No query may accept `shopId` from client input** (form bodies, query parameters, route params, or client headers).
- `shopId` MUST always be extracted strictly from the verified, authenticated session on the server.
- **Tenant Data-Access Layer:** All Prisma queries must go through a centralized tenant-scoped data-access layer (e.g., `src/lib/db/tenant.ts` or scoped repositories) that automatically injects `where: { shopId, deletedAt: null }`. Direct un-scoped Prisma calls outside of authentication/shop bootstrapping are strictly prohibited.

### Rule 2: Integer Poisha for All Monetary Values
- **Never use floating-point numbers (`Float`) for money.**
- Money is strictly stored as integers in **poisha** (1 Bangladeshi Taka = 100 poisha).
  - Example: ৳150.50 is stored as `15050`.
  - Example: ৳5,000 is stored as `500000`.
- All monetary math (addition, subtraction, discounts) is performed on integers.
- Provide and strictly use standard money helpers (`toPoisha`, `fromPoisha`, `formatMoney`, `formatMoneyBn`).

### Rule 3: Append-Only Ledger & Balance Derivation
- The ledger (`LedgerEntry`) is strictly **append-only**. Ledger entries are never edited in-place.
- A customer's true due balance is mathematically derived from the sum of ledger entries:
  $$\text{Balance} = \sum \text{Debit (Due created)} - \sum \text{Credit (Payment received)}$$
- A `cachedBalancePoisha` column exists on `Customer` for query performance, but:
  - It **MUST** be updated inside the exact same database transaction that appends the `LedgerEntry`.
  - Reconcile scripts can recalculate `cachedBalancePoisha` from `LedgerEntry` rows at any time.

### Rule 4: Stock Movement Invariants
- Product inventory is derived from `StockMovement` rows.
- Every stock change (sale, purchase, return, damage, audit adjustment) MUST record a `StockMovement` entry with quantity and movement type.
- A `cachedStock` field exists on `Product`, but:
  - It **MUST** be updated inside the exact same database transaction as the `StockMovement`.
  - An audit script can reconcile `cachedStock` from the sum of `StockMovement` rows.

### Rule 5: Atomic Sale Transaction
- When a sale is confirmed, the following operations MUST occur in **ONE Prisma transaction (`prisma.$transaction`)**:
  1. Create `Sale` record.
  2. Create all `SaleItem` records.
  3. Create `StockMovement` records for each product sold.
  4. Decrement `cachedStock` on each `Product`.
  5. If there is an unpaid due amount or payment recorded:
     - Create `LedgerEntry` for the customer.
     - Update customer `cachedBalancePoisha`.
  6. If paid amount > 0, create `Payment` record.
  7. Create `AuditLog` entry documenting the sale.
- If any single step fails, the entire transaction rolls back cleanly.

### Rule 6: Soft Deletes for All Business Records
- Business records (`Customer`, `Supplier`, `Product`, `Sale`, `SaleItem`, `Payment`, `LedgerEntry`) are **never hard-deleted** via `DELETE FROM`.
- Every business table contains a `deletedAt DateTime?` field.
- Active queries must include `deletedAt: null`. Deleting a record sets `deletedAt: new Date()` and records an `AuditLog`.

### Rule 7: Strict Server-Side Zod Validation
- Every server action, mutation, and API endpoint MUST validate its payload using server-defined Zod schemas.
- Client validation is solely for instant UX feedback; server validation is the authoritative gatekeeper.

### Rule 8: Comprehensive Audit Logging
- Every create, update, soft-delete, and financial/stock cancellation MUST append an `AuditLog` row.
- The `AuditLog` records:
  - `shopId`
  - `userId` (actor)
  - `action` (CREATE | UPDATE | DELETE | CANCEL | LOGIN)
  - `entityType` (e.g., "Sale", "Customer", "Product", "Payment")
  - `entityId`
  - `oldValues` (JSON snapshot prior to mutation)
  - `newValues` (JSON snapshot after mutation)
  - `createdAt`

### Rule 9: Offline Readiness & Idempotency Keys
- In anticipation of offline/low-connectivity PWA operations, client devices will generate UUIDs (`clientId`) for new offline records.
- To prevent duplicate entries when syncing, a compound unique index `@@unique([shopId, clientId])` is enforced on:
  - `Sale`
  - `Payment`
  - `LedgerEntry`

### Rule 10: Bangla-First i18n & Display Numerals
- The primary interface language is **Bangla (বাংলা)** with English fallback.
- **No hardcoded UI strings in components.** All text must flow through an i18n dictionary system (e.g. `src/lib/i18n`).
- **Bangla Numeral Formatting at Render Time Only:**
  - Database, calculations, and JSON APIs operate strictly on standard JavaScript numbers (`0-9`).
  - Numbers are converted to Bangla digits (`০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯`) only at the final presentation/UI render step using `formatBanglaNumber()` or `formatMoneyBn()`.

---

## 2. Directory Structure Convention

```text
src/
├── app/                      # Next.js App Router routes & layouts
│   ├── (auth)/               # Login, Signup, Reset
│   ├── (dashboard)/          # Authenticated app shell
│   │   ├── customers/        # Customer list, details, ledger
│   │   ├── sales/            # POS billing, invoice view, print
│   │   ├── products/         # Inventory, product catalog
│   │   ├── due-list/         # Customer due balances & recovery
│   │   ├── payments/         # Payment collection
│   │   └── settings/         # Shop profile & preferences
│   └── api/                  # API routes (Auth.js, print, exports)
├── components/               # Shared UI components (shadcn/ui primitives)
│   └── ui/
├── features/                 # Modular feature domains
│   ├── auth/                 # Auth schemas, actions, hooks
│   ├── customers/            # Customer queries, mutations, components
│   ├── ledger/               # Ledger entries, running balance calculations
│   ├── payments/             # Payment processing & vouchers
│   ├── products/             # Inventory, pricing, stock movement logic
│   └── sales/                # Checkout cart, sale transaction, invoice generator
├── lib/                      # Core cross-cutting utilities
│   ├── db/                   # Prisma client & tenant-scoped data access helpers
│   ├── i18n/                 # Bangla/English dictionaries & numeral formatters
│   ├── money/                # Poisha math & formatting helpers
│   ├── audit/                # Audit logger helper
│   └── utils.ts              # Styling & general helpers
└── types/                    # Shared TypeScript definitions
```

---

## 3. Testing & Verification Standards
- **Unit & Integration Tests (Vitest):**
  - Money conversion & arithmetic (`toPoisha`, `fromPoisha`, `formatMoney`).
  - Ledger balance calculation (running balances, debit/credit integrity).
  - Sale transaction atomicity and stock decrement validation.
  - Zod validation schemas.
- **Linting & Type Safety:**
  - TypeScript strict mode enabled (`"strict": true`).
  - ESLint passing before any phase is marked complete.
