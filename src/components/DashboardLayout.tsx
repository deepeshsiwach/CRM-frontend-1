"use client";

// ============================================================
// DERIVION CRM - LAYOUT WRAPPER COMPONENT
// Wraps dashboard pages with header + sidebar layout
// ============================================================

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getToken, getUserName, getUserRole, logout, PAGE_ACCESS } from "@/lib/auth";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { href: "/dashboard",           label: "🏠 Dashboard",              key: "dashboard" },
    { href: "/leads",               label: "👥 Leads",                   key: "leads" },
    { href: "/lead-assignments",    label: "📋 Lead Assignments",        key: "lead-assignments", restricted: true },
    { href: "/closed-leads",        label: "✅ Closed / Disposed Leads", key: "closed-leads" },
    { href: "/call-logs",           label: "📞 Call Logs",               key: "call-logs" },
    { href: "/follow-ups",          label: "📅 Follow-ups",              key: "follow-ups" },
    { href: "/notes",               label: "📝 Notes",                   key: "notes" },
    { href: "/users",               label: "👤 Users",                   key: "users",            restricted: true, adminOnly: true },
    { href: "/teams",               label: "🏢 Teams",                   key: "teams",            restricted: true },
    { href: "/courses",             label: "🎓 Courses",                 key: "courses",          restricted: true },
    { href: "/campaigns",           label: "📣 Campaigns",               key: "campaigns",        restricted: true },
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        {/* Logo + mobile hamburger */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-gray-300 hover:text-white mr-1"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Image src="/derivion_logo.png" alt="DERIVION" width={120} height={40} priority />
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <span id="userName" className="text-sm text-gray-300 hidden sm:inline">{userName}</span>
          <button
            id="logoutButton"
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* =================================================
            SIDEBAR
            ================================================= */}
        <aside
          className={`
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
            fixed md:static inset-y-0 left-0 z-40
            w-60 bg-gray-900 text-white flex-shrink-0
            transition-transform duration-300 ease-in-out
            pt-16 md:pt-0
          `}
        >
          {/* Backdrop for mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="relative z-40 h-full bg-gray-900 px-4 py-6">
            <h2 className="text-base font-semibold text-gray-400 uppercase tracking-widest mb-5 px-2">
              Menu
            </h2>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) =>
                isLinkVisible(link) ? (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      text-sm px-3 py-2.5 rounded-lg transition-all duration-200 block
                      ${currentKey === link.key
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                ) : null
              )}
            </nav>
          </div>
        </aside>

        {/* =================================================
            MAIN CONTENT
            ================================================= */}
        <main className="flex-1 min-w-0 p-6 md:p-8 overflow-auto">
          {title && <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>}
          {children}
        </main>
      </div>
    </div>
  );
}
