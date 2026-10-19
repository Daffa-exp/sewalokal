"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileBarChart,
  Download,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatRupiah,
  formatDateIndonesia,
  isValidIndonesianPhone,
  buildBillingReminderMessage,
  createWhatsAppReminderUrl,
} from "@/lib/formatters";
import { FinancialSummary, MonthlyReportItem } from "@/features/billing/types";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function ReportsPageContent() {
  const [currentMonth, setCurrentMonth] = React.useState<number>(
    () => new Date().getMonth() + 1
  );
  const [currentYear, setCurrentYear] = React.useState<number>(
    () => new Date().getFullYear()
  );
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<string>("ALL");

  const [properties, setProperties] = React.useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = React.useState<FinancialSummary | null>(null);
  const [items, setItems] = React.useState<MonthlyReportItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [phoneAlert, setPhoneAlert] = React.useState<string | null>(null);

  // Fetch properties once
  React.useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setProperties(json.data || []);
          }
        }
      } catch (err) {
        console.error("Gagal memuat properti:", err);
      }
    }
    fetchProperties();
  }, []);

  const [refreshIndex, setRefreshIndex] = React.useState(0);

  const loadReportData = React.useCallback(() => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  // Fetch report data based on filters
  React.useEffect(() => {
    let active = true;

    const params = new URLSearchParams({
      month: currentMonth.toString(),
      year: currentYear.toString(),
    });
    if (selectedPropertyId && selectedPropertyId !== "ALL") {
      params.append("propertyId", selectedPropertyId);
    }

    fetch(`/api/reports?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data laporan");
        return res.json();
      })
      .then((json) => {
        if (!active) return;
        if (json.success) {
          setSummary(json.data.summary);
          setItems(json.data.items || []);
          setError(null);
        } else {
          setError(json.error || "Gagal memproses laporan");
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError("Gagal memuat rekap laporan bulanan. Silakan coba kembali.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentMonth, currentYear, selectedPropertyId, refreshIndex]);

  // Handle WhatsApp reminder
  const handleSendReminder = async (item: MonthlyReportItem) => {
    setPhoneAlert(null);
    const phone = item.tenantPhone;

    if (!phone || !isValidIndonesianPhone(phone)) {
      setPhoneAlert(
        `Nomor WhatsApp untuk ${item.tenantName} (${phone || "kosong"}) tidak valid atau belum terdaftar.`
      );
      return;
    }

    const message = buildBillingReminderMessage({
      tenantName: item.tenantName,
      propertyName: item.propertyName,
      roomNumber: item.roomNumber,
      periodMonth: item.periodMonth,
      periodYear: item.periodYear,
      remainingBalance: item.remainingBalance,
      dueDate: item.dueDate,
    });

    const url = createWhatsAppReminderUrl(phone, message);

    try {
      await fetch(`/api/invoices/${item.id}/reminder`, {
        method: "POST",
      });
      loadReportData();
    } catch (e) {
      console.error("Gagal mencatat status pengingat:", e);
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // CSV Export URL builder
  const getExportUrl = () => {
    const params = new URLSearchParams({
      month: currentMonth.toString(),
      year: currentYear.toString(),
    });
    if (selectedPropertyId && selectedPropertyId !== "ALL") {
      params.append("propertyId", selectedPropertyId);
    }
    return `/api/reports/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Rekap & Laporan Keuangan Kos
            </h1>
            <Badge variant="outline" className="text-xs">
              Laporan Bulanan
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Rekap pendapatan sewa, penagihan, sisa piutang, dan histori pembayaran per unit kamar.
          </p>
        </div>

        {/* Filter Bar & Export Button */}
        <div className="flex flex-wrap items-center gap-2 bg-card p-2 rounded-lg border">
          {/* Property Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-muted-foreground ml-1" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
              aria-label="Pilih Properti"
            >
              <option value="ALL">Semua Properti Kos</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Month Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
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

            {/* Year Filter */}
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
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadReportData}
            disabled={loading}
            className="h-8 px-2 text-xs"
            title="Segarkan data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Download CSV button */}
          <a
            href={getExportUrl()}
            download
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Ekspor CSV
          </a>
        </div>
      </div>

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

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tagihan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Tagihan Diterbitkan
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-foreground">
                {formatRupiah(summary?.totalBilled || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {items.length} invoice periode {MONTH_NAMES[currentMonth - 1]}
            </p>
          </CardContent>
        </Card>

        {/* Pemasukan Riil Diterima */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pemasukan Riil Diterima
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(summary?.totalPaid || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Dari {summary?.paidCount || 0} tagihan yang lunas
            </p>
          </CardContent>
        </Card>

        {/* Sisa Piutang */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sisa Piutang Belum Lunas
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatRupiah(summary?.remainingReceivable || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.unpaidCount || 0} tagihan belum tuntas
            </p>
          </CardContent>
        </Card>

        {/* Tunggakan Jatuh Tempo */}
        <Card>
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
              <div className="text-xl font-bold text-destructive">
                {formatRupiah(summary?.overdueAmount || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.overdueCount || 0} tagihan melewati batas
            </p>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tingkat Pelunasan
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-foreground">
                {summary?.collectionRate || 0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Rasio kas masuk vs total tagihan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-primary" />
              Rincian Tagihan & Status Pembayaran
            </CardTitle>
            <CardDescription>
              Daftar seluruh tagihan periode {MONTH_NAMES[currentMonth - 1]} {currentYear} beserta status penerimaannya.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">
            Menampilkan {items.length} catatan tagihan
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-y text-muted-foreground uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">No. Tagihan</th>
                  <th className="px-4 py-3">Properti & Kamar</th>
                  <th className="px-4 py-3">Nama Penghuni</th>
                  <th className="px-4 py-3">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-right">Total Tagihan</th>
                  <th className="px-4 py-3 text-right">Terbayar</th>
                  <th className="px-4 py-3 text-right">Sisa Tagihan</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5"><div className="h-4 w-24 bg-muted rounded" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-28 bg-muted rounded" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-20 bg-muted rounded" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-16 bg-muted rounded" /></td>
                      <td className="px-4 py-3.5 text-right"><div className="h-4 w-16 bg-muted rounded ml-auto" /></td>
                      <td className="px-4 py-3.5 text-right"><div className="h-4 w-16 bg-muted rounded ml-auto" /></td>
                      <td className="px-4 py-3.5 text-right"><div className="h-4 w-16 bg-muted rounded ml-auto" /></td>
                      <td className="px-4 py-3.5 text-center"><div className="h-4 w-12 bg-muted rounded mx-auto" /></td>
                      <td className="px-4 py-3.5 text-center"><div className="h-4 w-14 bg-muted rounded mx-auto" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="font-medium text-sm">Tidak Ada Tagihan Ditemukan</p>
                      <p className="text-xs mt-1">
                        Belum ada invoice yang diterbitkan untuk periode {MONTH_NAMES[currentMonth - 1]} {currentYear}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                        {item.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{item.propertyName}</div>
                        <div className="text-[11px] text-muted-foreground">Kamar {item.roomNumber}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{item.tenantName}</div>
                        <div className="text-[11px] text-muted-foreground">{item.tenantPhone || "Tanpa telepon"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                        {formatDateIndonesia(item.dueDate)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-foreground whitespace-nowrap">
                        {formatRupiah(item.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatRupiah(item.totalPaid)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap">
                        {item.remainingBalance > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatRupiah(item.remainingBalance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">Rp 0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={
                            item.status === "PAID"
                              ? "default"
                              : item.status === "OVERDUE"
                                ? "destructive"
                                : item.status === "PARTIAL"
                                  ? "secondary"
                                  : "outline"
                          }
                          className="text-[10px] uppercase font-mono px-1.5 py-0"
                        >
                          {item.status === "PAID"
                            ? "Lunas"
                            : item.status === "PARTIAL"
                              ? "Sebagian"
                              : item.status === "OVERDUE"
                                ? "Jatuh Tempo"
                                : "Belum Lunas"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status !== "PAID" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendReminder(item)}
                              title="Kirim pengingat WhatsApp"
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Link
                            href={`/dashboard/invoices/${item.id}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                            title="Lihat detail invoice"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ReportsPageContent />
    </React.Suspense>
  );
}
