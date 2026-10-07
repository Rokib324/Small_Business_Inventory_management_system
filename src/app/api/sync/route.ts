/**
 * Baki (বাকি) - Offline Sync API Route (/api/sync)
 * POST: Pushes queued offline actions, executes idempotently, and returns deltas.
 * GET: Pulls delta products and customers since lastSyncAt.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { SyncRequestSchema } from "@/features/sync/schemas";
import { processSyncRequest } from "@/features/sync/sync-service";

export async function POST(req: NextRequest) {
  // 1. Session verification & Multi-tenant isolation (Rule 1)
  const session = await auth();
  if (!session?.user?.id || !session.user.shopId) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "আপনার লগইন সেশন মেয়াদোত্তীর্ণ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",
      },
      { status: 401 }
    );
  }

  const shopId = session.user.shopId;
  const userId = session.user.id;

  // 2. Parse & Zod validate request
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "অনুরোধের তথ্য সঠিক নয়।" },
      { status: 400 }
    );
  }

  const validation = SyncRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "ভুল ডাটা ফরম্যাট।",
        details: validation.error.flatten(),
      },
      { status: 422 }
    );
  }

  const { actions, lastSyncAt } = validation.data;

  try {
    // 3. Process actions idempotently
    const response = await processSyncRequest({
      shopId,
      userId,
      actions,
      lastSyncAt,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error("Sync API error:", error);
    const message = error instanceof Error ? error.message : "সার্ভারে সিঙ্ক প্রক্রিয়াকরণে সমস্যা হয়েছে।";
    return NextResponse.json(
      { error: "SYNC_FAILED", message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.shopId) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "লগইন সেশন নেই।",
      },
      { status: 401 }
    );
  }

  const shopId = session.user.shopId;
  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const lastSyncAt = searchParams.get("since");

  try {
    const response = await processSyncRequest({
      shopId,
      userId,
      actions: [], // No actions to push, only pull delta
      lastSyncAt,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error("Sync GET error:", error);
    return NextResponse.json(
      { error: "FETCH_FAILED", message: "ডাটা লোড করতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }
}
