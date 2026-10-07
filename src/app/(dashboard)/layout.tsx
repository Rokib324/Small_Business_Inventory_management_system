import { requireTenantSession } from "@/lib/auth/session";
import { TopHeader } from "@/components/layout/top-header";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenantSession();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <TopHeader
        shopName={session.user.shopName}
        userName={session.user.name || "ব্যবহারকারী"}
        userRole={session.user.role}
      />

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
