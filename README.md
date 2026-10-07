# Baki (বাকি) - Bangla-First Billing, Stock & Due-Ledger Web App

> সহজ হিসাব, দ্রুত বাকি খাতা — Designed for retail & wholesale small businesses in Bangladesh (starting with hardware stores).

---

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (Strict)
- **Styling:** Tailwind CSS v4 + Lucide Icons
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Authentication:** Auth.js / NextAuth v5 (Phone/Email + Password credentials)
- **Validation:** Server-side Zod schemas
- **Testing:** Vitest
- **Linting & Formatting:** ESLint + Prettier

---

## 📜 10 Non-Negotiable Core Rules (Enforced)
1. **Multi-Tenant:** Every business table has `shopId`. All queries pass through `src/lib/db/tenant.ts` filtering strictly by session `shopId`. Client input can never supply or override `shopId`.
2. **Integer Poisha:** All money is stored as integer poisha (`1 BDT = 100 poisha`). Floats are disallowed. Handled via `src/lib/money`.
3. **Append-Only Ledger:** Customer dues are derived from `LedgerEntry` rows (`sum(debit) - sum(credit)`). `cachedBalancePoisha` is updated in the same transaction.
4. **Derived Stock:** Stock is derived from `StockMovement`. `cachedStock` is updated in the same transaction.
5. **Atomic Sale Transaction:** Sale creation (`Sale` + `SaleItem`s + `StockMovement`s + `LedgerEntry` + `Payment` + `AuditLog`) executes in ONE `prisma.$transaction`.
6. **Soft Deletes:** `deletedAt DateTime?` on all business records.
7. **Server-Side Zod:** All inputs validated on the server with Zod.
8. **Audit Logging:** Every mutation logs changes to `AuditLog`.
9. **Offline Idempotency:** Compound unique index `@@unique([shopId, clientId])` on `Sale`, `Payment`, and `LedgerEntry`.
10. **Bangla-First i18n & Numerals:** Database and calculations work in standard numbers; converted to Bangla numerals (`০-৯`) at UI render time only.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20+ or v22+)
- PostgreSQL running locally or via Docker

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set, for example:
```env
DATABASE_URL="postgresql://localhost:5432/baki_db"
AUTH_SECRET="your-development-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migration & Seeding
Run migrations and seed the database with the demo hardware store:
```bash
npx prisma migrate dev
npm run seed
```

### 5. Run Unit & Integration Tests
```bash
npm run test
```

### 6. Start Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Accounts

| Role | Mobile Number | Password |
| :--- | :--- | :--- |
| **মালিক (Owner)** | `01711000000` | `password123` |
| **স্টাফ (Staff)** | `01711000001` | `password123` |

You can also register a brand new shop at `/signup`.
