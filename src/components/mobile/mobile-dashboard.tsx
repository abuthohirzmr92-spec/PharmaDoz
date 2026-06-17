"use client";

import { MobileHeader } from "./mobile-header";

export function MobileDashboard() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0F172A]">
      <MobileHeader />
      <div style={{ padding: 20, marginTop: 40 }}>
        <p style={{ fontSize: 18, fontWeight: "bold" }}>MOBILE DASHBOARD OK</p>
        <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>Header loaded.</p>
      </div>
    </div>
  );
}
