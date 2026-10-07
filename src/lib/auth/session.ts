/**
 * Baki (বাকি) - Authenticated Tenant Session Layer
 * Rule 1: Every query MUST filter by shopId taken from the authenticated session, never from client input.
 */

import { auth } from "./auth";
import { getTenantDb } from "@/lib/db/tenant";
import { redirect } from "next/navigation";

export async function getCurrentSession() {
  const session = await auth();
  return session;
}

export async function requireTenantSession() {
  const session = await auth();

  if (!session || !session.user || !session.user.shopId) {
    redirect("/login");
  }

  return session;
}

/**
 * Returns tenant-scoped database accessor strictly bound to the authenticated session's shopId.
 * No client parameter can override or bypass this shopId.
 */
export async function getSessionTenantDb() {
  const session = await requireTenantSession();
  const db = getTenantDb(session.user.shopId);
  return {
    session,
    shopId: session.user.shopId,
    user: session.user,
    db,
  };
}
