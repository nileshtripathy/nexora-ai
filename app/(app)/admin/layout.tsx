import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaffPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage(); // authorization: only ADMIN/AGENT may render anything under /admin
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
