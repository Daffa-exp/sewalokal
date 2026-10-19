"use client";

import * as React from "react";
import Link from "next/link";
import {
  DoorOpen,
  Wallet,
  AlertCircle,
  Building2,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Calendar,
  CreditCard,
  FileBarChart,
  RefreshCw,
  Users,
  FileText,
  MapPin,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatRupiah,
  formatDateIndonesia,
  isValidIndonesianPhone,
  buildBillingReminderMessage,
  createWhatsAppReminderUrl,
} from "@/lib/formatters";
import { FinancialSummary, InvoiceStatusType } from "@/features/billing/types";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PROPERTY_PLACEHOLDERS = [
  "/properties/property-1.svg",
  "/properties/property-2.svg",
  "/properties/property-3.svg",
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

interface DashboardOverviewData {
  propertiesCount: number;
  properties: Array<{
    id: string;
    name: string;
    city: string;
    address?: string;
    imageUrl?: string | null;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    startingRate: number;
    occupancyRate: number;
  }>;
  roomsStats: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    occupancyPercentage: number;
  };
  financials: FinancialSummary;
  recentPayments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    paymentMethod: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      occupancy: {
        tenant: { id: string; name: string };
        room: {
          roomNumber: string;
          property: { name: string };
        };
      };
    };
  }>;
  actionableInvoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    totalPaid: number;
    remainingBalance: number;
    dueDate: string;
    periodMonth: number;
    periodYear: number;
    status: InvoiceStatusType;
    reminderSentAt?: string | null;
    occupancy: {
      tenant: { id: string; name: string; phone: string | null };
      room: {
        roomNumber: string;
        property: { id: string; name: string };
      };
    };
  }>;
}

function DashboardOverviewContent() {
  const [currentMonth, setCurrentMonth] = React.useState<number>(
    () => new Date().getMonth() + 1
  );
  const [currentYear, setCurrentYear] = React.useState<number>(
    () => new Date().getFullYear()
  );

  const [data, setData] = React.useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [phoneAlert, setPhoneAlert] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  const greeting = React.useMemo(() => getGreeting(), []);

  const loadData = React.useCallback(() => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    let active = true;

    fetch(`/api/dashboard/overview?month=${currentMonth}&year=${currentYear}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data dashboard");
        return res.json();
      })
      .then((json) => {
        if (!active) return;
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || "Gagal memuat ringkasan");
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError("Gagal memuat ringkasan dashboard. Silakan periksa koneksi atau coba lagi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentMonth, currentYear, refreshIndex]);

  const handleSendReminder = async (invoice: DashboardOverviewData["actionableInvoices"][0]) => {
    setPhoneAlert(null);
    const phone = invoice.occupancy.tenant.phone;

    if (!phone || !isValidIndonesianPhone(phone)) {
      setPhoneAlert(
        `Nomor WhatsApp untuk ${invoice.occupancy.tenant.name} (${phone || "kosong"}) tidak valid atau belum terdaftar.`
      );
      return;
    }

    const message = buildBillingReminderMessage({
      tenantName: invoice.occupancy.tenant.name,
      propertyName: invoice.occupancy.room.property.name,
      roomNumber: invoice.occupancy.room.roomNumber,
      periodMonth: invoice.periodMonth,
      periodYear: invoice.periodYear,
      remainingBalance: invoice.remainingBalance,
      dueDate: invoice.dueDate,
    });

    const url = createWhatsAppReminderUrl(phone, message);

    try {
      await fetch(`/api/invoices/${invoice.id}/reminder`, {
        method: "POST",
      });
      loadData();
    } catch (e) {
      console.error("Gagal mencatat pengingat:", e);
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const financials = data?.financials;
  const roomsStats = data?.roomsStats;

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
              {greeting}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Ringkasan Operasional
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau ketersediaan kamar, penghuni aktif, status tagihan, dan pemasukan kos Anda.
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-card p-2 rounded-lg border shrink-0">
            <Calendar className="h-4 w-4 text-muted-foreground ml-1" />
            <span className="text-xs font-medium text-muted-foreground mr-1">Periode:</span>

            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="h-8 rounded-md border bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
              aria-label="Pilih Bulan"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="h-8 rounded-md border bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
              aria-label="Pilih Tahun"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-8 px-2 text-xs"
              title="Segarkan data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <Link
              href="/dashboard/reports"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <FileBarChart className="h-3.5 w-3.5 mr-1" />
              Laporan
            </Link>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/properties"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8 gap-1.5"}
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Properti
          </Link>
          <Link
            href="/dashboard/tenants"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8 gap-1.5"}
          >
            <Users className="h-3.5 w-3.5" />
            Tambah Penghuni
          </Link>
          <Link
            href="/dashboard/billing"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8 gap-1.5"}
          >
            <FileText className="h-3.5 w-3.5" />
            Terbitkan Tagihan
          </Link>
          <Link
            href="/dashboard/billing"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8 gap-1.5"}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Catat Pembayaran
          </Link>
        </div>
      </div>

      {/* Error / Alert Banners */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-center gap-3 text-sm"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {phoneAlert && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200 flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{phoneAlert}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPhoneAlert(null)} className="h-7 text-xs">
            Tutup
          </Button>
        </div>
      )}

      {/* Property Showcase */}
      {(loading || (data?.properties && data.properties.length > 0)) && (
        <section aria-label="Daftar Properti">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Properti Anda
            </h2>
            <Link
              href="/dashboard/properties"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Kelola
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-2 bg-muted rounded-full w-full mt-3" />
                    </div>
                  </div>
                ))
              : data?.properties.map((prop, idx) => {
                  const coverSrc = prop.imageUrl || PROPERTY_PLACEHOLDERS[idx % PROPERTY_PLACEHOLDERS.length];
                  const rate = prop.occupancyRate ?? 0;
                  const rateColor =
                    rate >= 80
                      ? "bg-emerald-500"
                      : rate >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500";

                  return (
                    <Link
                      key={prop.id}
                      href={`/dashboard/properties/${prop.id}`}
                      className="group rounded-xl border bg-card overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden bg-muted">
                        <img
                          src={coverSrc}
                          alt={prop.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                        <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border text-foreground">
                          {prop.city}
                        </span>
                      </div>

                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">
                          {prop.name}
                        </p>
                        {prop.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {prop.address}
                          </p>
                        )}

                        <div className="mt-1 space-y-1">
                          <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                            <span>{prop.occupiedRooms} / {prop.totalRooms} kamar terisi</span>
                            <span className="font-semibold text-foreground">{rate}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${rateColor}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>

                        {prop.startingRate > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-auto">
                            Mulai <span className="font-semibold text-foreground">{formatRupiah(prop.startingRate)}</span>/bln
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>
      )}

      {/* KPI Cards Grid (5 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Properti Aktif
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{data?.propertiesCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Kos terdaftar</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Kamar Terisi
            </CardTitle>
            <DoorOpen className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {roomsStats?.occupied || 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {roomsStats?.total || 0}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Okupansi {roomsStats?.occupancyPercentage || 0}% ({roomsStats?.vacant || 0} kosong)
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pemasukan Riil ({MONTH_NAMES[currentMonth - 1]})
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(financials?.totalPaid || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Pelunasan {financials?.collectionRate || 0}% dari tagihan
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sisa Tagihan Periode Ini
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatRupiah(financials?.remainingReceivable || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Dari {financials?.unpaidCount || 0} tagihan belum lunas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-destructive/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tunggakan Lewat Tempo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {formatRupiah(financials?.overdueAmount || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {financials?.overdueCount || 0} tagihan menunggak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Tagihan Perlu Ditindaklanjuti */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Tagihan Perlu Ditindaklanjuti
                </CardTitle>
                <CardDescription>
                  Daftar tagihan yang sudah lewat jatuh tempo atau belum diselesaikan.
                </CardDescription>
              </div>
              <Link
                href="/dashboard/billing?status=OVERDUE"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Lihat Semua
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                </div>
              ) : !data?.actionableInvoices || data.actionableInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-sm font-medium">Semua Tagihan Tertib</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tidak ada tunggakan jatuh tempo yang membutuhkan tindak lanjut saat ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.actionableInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {inv.occupancy.tenant.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • Kamar {inv.occupancy.room.roomNumber} ({inv.occupancy.room.property.name})
                          </span>
                          <Badge
                            variant={inv.status === "OVERDUE" ? "destructive" : "outline"}
                            className="text-[10px] uppercase font-mono px-1.5 py-0"
                          >
                            {inv.status === "OVERDUE" ? "Jatuh Tempo" : "Belum Lunas"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Sisa: <strong className="text-foreground">{formatRupiah(inv.remainingBalance)}</strong></span>
                          <span>Tempo: {formatDateIndonesia(inv.dueDate)}</span>
                          {inv.reminderSentAt && (
                            <span className="text-primary text-[11px]">
                              (Diingatkan {formatDateIndonesia(inv.reminderSentAt)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(inv)}
                          className="h-8 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Kirim WhatsApp
                        </Button>
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          Detail
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Aktivitas Pembayaran Terbaru */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Aktivitas Pembayaran Terbaru
                </CardTitle>
                <CardDescription>
                  Kas nyata yang baru saja dicatat oleh pemilik kos.
                </CardDescription>
              </div>
              <Link
                href="/dashboard/billing"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Riwayat
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-12 bg-muted animate-pulse rounded-lg" />
                  <div className="h-12 bg-muted animate-pulse rounded-lg" />
                </div>
              ) : !data?.recentPayments || data.recentPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-medium">Belum Ada Pembayaran Masuk</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Catat penerimaan uang sewa dari penyewa pada modul tagihan.
                  </p>
                  <Link
                    href="/dashboard/billing"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Catat Pembayaran
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {pay.invoice.occupancy.tenant.name}
                          </p>
                          <p className="text-muted-foreground">
                            Kamar {pay.invoice.occupancy.room.roomNumber} • {formatDateIndonesia(pay.paidAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatRupiah(pay.amount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground uppercase">
                          {pay.paymentMethod.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Guidance Box */}
          <div
            role="region"
            aria-label="Kaidah Akuntansi SewaLokal"
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs space-y-1.5"
          >
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Prinsip Keuangan Akurat</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Pemasukan yang dihitung adalah transaksi riil yang tidak dibatalkan. Mengirimkan pengingat melalui WhatsApp
              tidak memotong saldo hingga Anda mencatat konfirmasi penerimaan uangnya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <DashboardOverviewContent />
    </React.Suspense>
  );
}
