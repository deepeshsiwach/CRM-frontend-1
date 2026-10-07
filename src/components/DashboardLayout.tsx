"use client";

// ============================================================
// DERIVION CRM - LAYOUT WRAPPER COMPONENT
// Wraps dashboard pages with header + sidebar layout
// ============================================================

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getToken, getUserName, getUserRole, logout, RESTRICTED_PAGES, PAGE_ACCESS } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeMenu?: string;
  activePage?: string;
  title?: string;
}

export default function DashboardLayout({
  children,
  activeMenu,
  activePage,
  title,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("");


  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const name = getUserName();
    const role = getUserRole();
    setUserName(name || "User");
    setUserRole(role);

    // Access control - redirect if not allowed on current page
    const segments = pathname.split("/").filter(Boolean);
    const pageName = segments[0] || "dashboard";
    const allowed = PAGE_ACCESS[pageName];
    if (allowed && !allowed.includes(role)) {
      router.replace("/dashboard");
    }
  }, [router, pathname]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/leads", label: "Leads", key: "leads" },
    { href: "/lead-assignments", label: "Lead Assignments", key: "lead-assignments", restricted: true },
    { href: "/closed-leads", label: "Closed / Disposed Leads", key: "closed-leads" },
    { href: "/call-logs", label: "Call Logs", key: "call-logs" },
    { href: "/follow-ups", label: "Follow-ups", key: "follow-ups" },
    { href: "/notes", label: "Notes", key: "notes" },
    { href: "/users", label: "Users", key: "users", restricted: true, adminOnly: true },
    { href: "/teams", label: "Teams", key: "teams", restricted: true },
    { href: "/courses", label: "Courses", key: "courses", restricted: true },
    { href: "/campaigns", label: "Campaigns", key: "campaigns", restricted: true },
  ];

  const isLinkVisible = (link: typeof navLinks[number]) => {
    if (!link.restricted) return true;
    if (link.adminOnly) return userRole === "ADMIN";
    return userRole === "ADMIN" || userRole === "MANAGER";
  };

  const handleLogout = () => {
    logout();
  };

  const currentKey = activePage || activeMenu || (pathname.split("/").filter(Boolean)[0] || "dashboard");

  return (
    <div className="dashboard-container">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <header className="dashboard-header">
        <h1 className="brand-logo">
          <Image src="/derivion_logo.png" alt="DERIVION" width={120} height={40} />
        </h1>

        <div className="user-info">
          <NotificationBell />
          <span id="userName">{userName}</span>
          <button id="logoutButton" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* =================================================
            SIDEBAR
            ================================================= */}
        <aside className="sidebar">
          <h2>Menu</h2>
          <nav>
            {navLinks.map((link) =>
              isLinkVisible(link) ? (
                <Link
                  key={link.key}
                  href={link.href}
                  className={currentKey === link.key ? "active" : ""}
                >
                  {link.label}
                </Link>
              ) : null
            )}
          </nav>
        </aside>

        {/* =================================================
            MAIN CONTENT
            ================================================= */}
        <main className="dashboard-content">
          {title && <h2>{title}</h2>}
          {children}
        </main>
      </div>
    </div>
  );
}
