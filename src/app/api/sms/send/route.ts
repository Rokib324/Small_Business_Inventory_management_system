import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { z } from "zod";
import { checkSmsRateLimit } from "@/features/sms/rate-limiter";
import {
  sendDueReminderSms,
  sendBulkDueReminderSms,
  sendSaleReceiptSms,
} from "@/features/sms/service";

const ApiSmsRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("due_reminder"),
    customerId: z.string().min(1),
    customMessage: z.string().optional(),
    templateId: z.string().optional(),
  }),
  z.object({
    action: z.literal("bulk_due_reminder"),
    minDueAmountPoisha: z.number().nonnegative(),
    customMessage: z.string().optional(),
    templateId: z.string().optional(),
  }),
  z.object({
    action: z.literal("sale_receipt"),
    saleId: z.string().min(1),
    customMessage: z.string().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "অননুমোদিত অ্যাক্সেস" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const ip = req.headers.get("x-forwarded-for") || "local";

    // Rate-limit check per shop and IP
    const rateLimit = checkSmsRateLimit(`api_${shopId}_${ip}`, 15, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "রেট লিমিট অতিক্রম করেছে। অনুগ্রহ করে পরে চেষ্টা করুন।",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ApiSmsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "অবৈধ তথ্য ফরম্যাট", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;

    switch (parsed.data.action) {
      case "due_reminder": {
        const result = await sendDueReminderSms({
          shopId,
          customerId: parsed.data.customerId,
          customMessage: parsed.data.customMessage,
          templateId: parsed.data.templateId,
          userId: session.user.id,
        });
        return NextResponse.json(result);
      }
      case "bulk_due_reminder": {
        const result = await sendBulkDueReminderSms({
          shopId,
          minDueAmountPoisha: parsed.data.minDueAmountPoisha,
          customMessage: parsed.data.customMessage,
          templateId: parsed.data.templateId,
          userId: session.user.id,
        });
        return NextResponse.json(result);
      }
      case "sale_receipt": {
        const result = await sendSaleReceiptSms({
          shopId,
          saleId: parsed.data.saleId,
          customMessage: parsed.data.customMessage,
          origin,
          userId: session.user.id,
        });
        return NextResponse.json(result);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "এসএমএস প্রেরণে ত্রুটি ঘটেছে";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
