"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring rounded-md p-1"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span>SewaLokal</span>
          </Link>
          <span className="hidden sm:inline-flex text-xs font-medium text-muted-foreground border border-border px-2 py-0.5 rounded-full">
            Fase 0: Fondasi
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="#fitur"
            className="text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring rounded-sm px-1 py-0.5"
          >
            Fitur
          </Link>
          <Link
            href="#arsitektur"
            className="text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring rounded-sm px-1 py-0.5"
          >
            Arsitektur
          </Link>
          <Link
            href="#status"
            className="text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring rounded-sm px-1 py-0.5"
          >
            Status Sistem
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Masuk
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Daftar Akun Kos
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={mobileMenuOpen}
            className="min-h-[44px] min-w-[44px]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link
              href="#fitur"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            >
              Fitur
            </Link>
            <Link
              href="#arsitektur"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            >
              Arsitektur
            </Link>
            <Link
              href="#status"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            >
              Status Sistem
            </Link>
            <div className="pt-2 border-t flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({ className: "w-full justify-center" })}
              >
                Daftar Akun Kos
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
