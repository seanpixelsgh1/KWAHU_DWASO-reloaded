"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Area */}
      <div className="admin-main">
        <Header onMenuClick={() => setMobileOpen(true)} />

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
