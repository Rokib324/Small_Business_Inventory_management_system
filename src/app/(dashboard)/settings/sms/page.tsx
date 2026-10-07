import { getSessionTenantDb } from "@/lib/auth/session";
import { SmsSettingsView } from "@/features/sms/components/sms-settings-view";
import { getShopSmsStats } from "@/features/sms/service";
import { prisma } from "@/lib/db/prisma";

export default async function SmsSettingsPage() {
  const { shopId } = await getSessionTenantDb();

  const [stats, logs, templates] = await Promise.all([
    getShopSmsStats(shopId),
    prisma.smsLog.findMany({
      where: { shopId },
      include: {
        customer: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.smsTemplate.findMany({
      where: { shopId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const providerName = process.env.SMS_PROVIDER || "mock";

  return (
    <SmsSettingsView
      stats={stats}
      logs={logs}
      templates={templates}
      providerName={providerName}
    />
  );
}
