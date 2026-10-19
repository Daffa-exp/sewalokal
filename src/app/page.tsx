import Link from "next/link";
import {
  Building2,
  DoorOpen,
  Users,
  Receipt,
  ShieldCheck,
  Database,
  ArrowRight,
  Code2,
  CheckCircle2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { DemoFormatter } from "@/components/demo-formatter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="px-3 py-1 font-medium text-xs">
                  SaaS Pengelolaan Kos Indonesia
                </Badge>
                <span className="text-xs text-muted-foreground">Versi 0.1.0</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                Kelola Properti Kos Anda Secara Rapi, Akurat, dan Teratur.
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Platform pencatatan kamar, penghuni, tagihan bulanan, pembayaran manual, dan
                pengingat sewa WhatsApp tanpa kerumitan administrasi manual di buku atau spreadsheet.
              </p>

              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <Link
                  href="/register"
                  className={buttonVariants({ size: "lg", className: "gap-2" })}
                >
                  <span>Mulai Kelola Kos</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Masuk ke Akun
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur Utama */}
        <section id="fitur" className="py-16 sm:py-20 border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Fitur Inti Pengelolaan SewaLokal
              </h2>
              <p className="mt-3 text-muted-foreground">
                Didesain khusus untuk pemilik kos kecil hingga menengah agar pengelolaan harian lebih efisien.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Properti & Kamar</CardTitle>
                  <CardDescription>
                    Pencatatan unit kamar, harga sewa bulanan, dan status ketersediaan (Kosong, Terisi, Perawatan).
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Users className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Data Penghuni</CardTitle>
                  <CardDescription>
                    Simpan nomor kontak WhatsApp, identitas, tanggal mulai sewa, dan kontak darurat keluarga.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Tagihan & Rekap</CardTitle>
                  <CardDescription>
                    Penerbitan tagihan bulanan berkala, status belum bayar atau lunas, serta riwayat pembayaran.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Pengingat WhatsApp</CardTitle>
                  <CardDescription>
                    Kirim pesan konfirmasi tagihan sewa langsung ke WhatsApp penghuni dengan tautan wa.me instan.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Demo Formatters Interaktif */}
        <section className="py-16 sm:py-20 border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Uji Interaktif: Format Lokal & WhatsApp
              </h2>
              <p className="mt-3 text-muted-foreground">
                Komponen utilitas yang siap memformat mata uang Rupiah dan menormalisasi nomor WhatsApp Indonesia.
              </p>
            </div>

            <DemoFormatter />
          </div>
        </section>

        {/* Arsitektur & Status Fondasi (Fase 0) */}
        <section id="arsitektur" className="py-16 sm:py-20 border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Fondasi Arsitektur & Keamanan
              </h2>
              <p className="mt-3 text-muted-foreground">
                Struktur teknis yang dibangun pada Fase 0 untuk memastikan keandalan sistem jangka panjang.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Database className="h-5 w-5" />
                    <CardTitle className="text-base">Prisma & PostgreSQL</CardTitle>
                  </div>
                  <CardDescription>
                    Skema relasional lengkap memodelkan User, Properti, Kamar, Penghuni, Kontrak Sewa, Tagihan, dan Pembayaran.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Generator Prisma Client tersinkron</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Singleton connection pool di Next.js</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <ShieldCheck className="h-5 w-5" />
                    <CardTitle className="text-base">Keamanan & Isolasi Data</CardTitle>
                  </div>
                  <CardDescription>
                    Data terisolasi per akun pemilik kos di server-side untuk mencegah kerentanan IDOR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Hashing password bcrypt</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Cookie HttpOnly & sesi JWT terenkripsi</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Code2 className="h-5 w-5" />
                    <CardTitle className="text-base">Validasi & Pengujian</CardTitle>
                  </div>
                  <CardDescription>
                    Pengecekan input terstandarisasi dengan skema Zod dan verifikasi otomatis via Vitest.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Validasi client dan server sinkron</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Harness Vitest & Playwright siap</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Status Sistem Section */}
        <section id="status" className="py-12 border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border bg-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <p className="font-semibold text-sm">Fase 0: Fondasi Siap Digunakan</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Seluruh dependensi, komponen UI, skema basis data, dan helper pengujian telah siap untuk melanjutkan ke Fase berikutnya.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/register" className={buttonVariants({ size: "sm" })}>
                  Buat Akun Kos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <Building2 className="h-3 w-3" />
            </div>
            <span className="font-semibold text-foreground">SewaLokal</span>
            <span>&copy; 2026 Hak Cipta Dilindungi.</span>
          </div>
          <p>Dibuat untuk pengelolaan kos lokal Indonesia yang lebih tertib.</p>
        </div>
      </footer>
    </div>
  );
}
