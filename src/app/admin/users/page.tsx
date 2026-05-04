import { Metadata } from "next";
import UsersClient from "@/components/admin/UsersClient";

export const metadata: Metadata = {
  title: "Users Management | Admin | KwahuDwaso",
};

export default function AdminUsersPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <UsersClient />
    </div>
  );
}
