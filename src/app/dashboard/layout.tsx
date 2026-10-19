"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  DoorOpen,
  Users,
  Receipt,
  FileBarChart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Ringkasan",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Properti Kos",
    href: "/dashboard/properties",
    icon: Building2,
  },
  {
    title: "Kamar",
    href: "/dashboard/rooms",
    icon: DoorOpen,
  },
  {
    title: "Data Penghuni",
    href: "/dashboard/tenants",
    icon: Users,
  },
  {
    title: "Tagihan & Pembayaran",
    href: "/dashboard/billing",
    icon: Receipt,
  },
  {
    title: "Rekap & Laporan",
    href: "/dashboard/reports",
    icon: FileBarChart,
  },
];

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <div key={item.title}>
            {item.disabled ? (
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground/60 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                onClick={onNavClick}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState<{ name: string; email: string } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.authenticated && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="md:hidden flex h-16 items-center justify-between border-b px-4 bg-background z-30 sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span>SewaLokal</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Tutup menu dashboard" : "Buka menu dashboard"}
            aria-expanded={mobileMenuOpen}
            className="min-h-[44px] min-w-[44px]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform md:translate-x-0 md:static md:flex md:flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span>SewaLokal</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3">
          <React.Suspense fallback={<div className="space-y-2 py-2" />}>
            <SidebarNav onNavClick={() => setMobileMenuOpen(false)} />
          </React.Suspense>
        </div>

        <div className="border-t p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <p className="font-semibold text-foreground truncate max-w-[140px]">
                {user?.name || "Pemilik Kos"}
              </p>
              <p className="text-muted-foreground truncate max-w-[140px]">
                {user?.email || "Akun Terverifikasi"}
              </p>
            </div>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Sesi</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
