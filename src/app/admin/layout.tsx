import { auth } from "@/auth";
import AdminShell from "@/components/admin/AdminShell";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard — KwahuDwaso",
  description: "KwahuDwaso enterprise administration panel",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  // Strict access control — only admins may enter
  if (!session?.user || userRole !== "admin") {
    redirect("/unauthorized");
  }

  return <AdminShell>{children}</AdminShell>;
}
