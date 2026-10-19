"use client";

import * as React from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Users,
  Eye,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRupiah, formatDateIndonesia, createWhatsAppReminderUrl } from "@/lib/formatters";
import { InvoiceStatusType } from "@/features/billing/types";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number;
  totalPaid: number;
  remainingBalance: number;
  dueDate: string;
  periodMonth: number;
  periodYear: number;
  status: InvoiceStatusType;
  occupancy: {
    id: string;
    tenant: { id: string; name: string; phone: string | null };
    room: {
      roomNumber: string;
      property: { id: string; name: string };
    };
  };
}

interface PaymentItem {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  notes: string | null;
  isCancelled: boolean;
  cancelReason: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    occupancy: {
      tenant: { name: string };
      room: { roomNumber: string; property: { name: string } };
    };
  };
}

interface OccupancyOption {
  id: string;
  roomNumber: string;
  propertyName: string;
  tenantName: string;
  monthlyRent: number;
  billingDueDay: number;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function BillingPageContent() {
  const [currentMonth] = React.useState(() => new Date().getMonth() + 1);
  const [currentYear] = React.useState(() => new Date().getFullYear());

  const [activeTab, setActiveTab] = React.useState<"invoices" | "payments">("invoices");
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [payments, setPayments] = React.useState<PaymentItem[]>([]);
  const [occupancies, setOccupancies] = React.useState<OccupancyOption[]>([]);
  const [properties, setProperties] = React.useState<Array<{ id: string; name: string }>>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Filters
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [propertyFilter, setPropertyFilter] = React.useState<string>("ALL");
  const [monthFilter, setMonthFilter] = React.useState<number>(currentMonth);
  const [yearFilter, setYearFilter] = React.useState<number>(currentYear);

  // Single Invoice Modal
  const [isSingleOpen, setIsSingleOpen] = React.useState(false);
  const [singleLoading, setSingleLoading] = React.useState(false);
  const [singleError, setSingleError] = React.useState<string | null>(null);
  const [singleData, setSingleData] = React.useState({
    occupancyId: "",
    periodMonth: currentMonth,
    periodYear: currentYear,
    dueDate: new Date().toISOString().split("T")[0],
    amount: "",
  });

  // Bulk Invoice Modal
  const [isBulkOpen, setIsBulkOpen] = React.useState(false);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [bulkError, setBulkError] = React.useState<string | null>(null);
  const [bulkResult, setBulkResult] = React.useState<{
    totalEligible: number;
    generatedCount: number;
    skippedCount: number;
  } | null>(null);
  const [bulkData, setBulkData] = React.useState({
    periodMonth: currentMonth,
    periodYear: currentYear,
    propertyId: "ALL",
  });

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        // Fetch properties
        const propsRes = await fetch("/api/properties");
        if (propsRes.ok) {
          const propsData = await propsRes.json();
          if (!ignore && propsData.success) {
            setProperties(propsData.data);
          }
        }

        // Fetch active rooms & occupancies for single invoice selection
        const roomsRes = await fetch("/api/rooms?status=OCCUPIED");
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          if (!ignore && roomsData.success) {
            const list: OccupancyOption[] = [];
            for (const r of roomsData.data) {
              const activeOcc = r.occupancies?.[0];
              if (activeOcc?.tenant) {
                list.push({
                  id: activeOcc.id,
                  roomNumber: r.roomNumber,
                  propertyName: r.property.name,
                  tenantName: activeOcc.tenant.name,
                  monthlyRent: activeOcc.monthlyRent ?? r.monthlyRate,
                  billingDueDay: activeOcc.billingDueDay ?? 1,
                });
              }
            }
            setOccupancies(list);
            if (list.length > 0 && !singleData.occupancyId) {
              setSingleData((prev) => ({
                ...prev,
                occupancyId: list[0].id,
                amount: list[0].monthlyRent.toString(),
              }));
            }
          }
        }

        // Fetch invoices with active filters
        const invParams = new URLSearchParams();
        if (statusFilter !== "ALL") invParams.set("status", statusFilter);
        if (propertyFilter !== "ALL") invParams.set("propertyId", propertyFilter);
        if (monthFilter) invParams.set("month", monthFilter.toString());
        if (yearFilter) invParams.set("year", yearFilter.toString());
        if (search.trim()) invParams.set("search", search.trim());

        const invRes = await fetch(`/api/invoices?${invParams.toString()}`);
        if (!invRes.ok) throw new Error("Gagal mengambil data tagihan");
        const invJson = await invRes.json();
        if (!ignore && invJson.success) {
          setInvoices(invJson.data);
        }

        // Fetch payments log
        const payRes = await fetch("/api/payments?limit=50");
        if (payRes.ok) {
          const payJson = await payRes.json();
          if (!ignore && payJson.success) {
            setPayments(payJson.data);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat data");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusFilter,
    propertyFilter,
    monthFilter,
    yearFilter,
    search,
    refreshKey,
  ]);

  // Financial metrics calculated from loaded invoices & payments
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
  const totalRemaining = invoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);
  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleLoading(true);
    setSingleError(null);

    const amountNum = parseFloat(singleData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSingleError("Nominal tagihan harus lebih dari 0");
      setSingleLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occupancyId: singleData.occupancyId,
          periodMonth: Number(singleData.periodMonth),
          periodYear: Number(singleData.periodYear),
          dueDate: singleData.dueDate,
          amount: amountNum,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menerbitkan tagihan");
      }

      setIsSingleOpen(false);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setSingleError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSingleLoading(false);
    }
  };

  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkLoading(true);
    setBulkError(null);
    setBulkResult(null);

    try {
      const res = await fetch("/api/invoices/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodMonth: Number(bulkData.periodMonth),
          periodYear: Number(bulkData.periodYear),
          propertyId: bulkData.propertyId === "ALL" ? undefined : bulkData.propertyId,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menerbitkan tagihan massal");
      }

      setBulkResult(result.data);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatusType) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Lunas</span>
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            <span>Sebagian</span>
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            <span>Terlambat</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            <span>Belum Bayar</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tagihan & Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Penerbitan tagihan bulanan penghuni dan pencatatan riwayat transaksi keuangan kos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setBulkError(null);
              setBulkResult(null);
              setIsBulkOpen(true);
            }}
            className="gap-2 text-xs h-9"
          >
            <Users className="h-4 w-4" />
            <span>Terbitkan Tagihan Massal</span>
          </Button>

          <Button
            onClick={() => {
              setSingleError(null);
              setIsSingleOpen(true);
            }}
            className="gap-2 text-xs h-9"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Tagihan</span>
          </Button>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Tagihan ({MONTH_NAMES[monthFilter - 1]} {yearFilter})
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">{formatRupiah(totalBilled)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dari {invoices.length} unit kamar ditagih
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pemasukan Riil Diterima
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalPaid)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Uang kas yang benar-benar masuk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sisa Piutang Sewa
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {formatRupiah(totalRemaining)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Menunggu pelunasan penyewa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tagihan Terlambat
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              {formatRupiah(overdueAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {overdueInvoices.length} invoice lewat jatuh tempo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-sm">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-2.5 px-4 font-semibold border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Daftar Tagihan ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-2.5 px-4 font-semibold border-b-2 transition-colors ${
            activeTab === "payments"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Riwayat Pembayaran ({payments.length})
        </button>
      </div>

      {/* Filters (Shown when in Invoices tab) */}
      {activeTab === "invoices" && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor tagihan, penghuni, kamar..."
              className="pl-9 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status tagihan"
            className="h-8 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNPAID">Belum Bayar</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="PAID">Lunas</option>
            <option value="OVERDUE">Terlambat</option>
          </select>

          {properties.length > 1 && (
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              aria-label="Filter kos"
              className="h-8 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">Semua Lokasi Kos</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(parseInt(e.target.value))}
            aria-label="Filter bulan"
            className="h-8 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(parseInt(e.target.value))}
            aria-label="Filter tahun"
            className="h-8 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Content for Invoices Tab */}
      {activeTab === "invoices" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 rounded-xl border bg-card/60 animate-pulse p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                  <Receipt className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base">Tidak ada tagihan pada periode ini</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Gunakan tombol &quot;Terbitkan Tagihan Massal&quot; atau &quot;Buat Tagihan&quot; untuk
                  menerbitkan tagihan sewa bagi penghuni aktif.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => setIsBulkOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Terbitkan Massal</span>
                  </Button>
                  <Button
                    onClick={() => setIsSingleOpen(true)}
                    size="sm"
                    className="gap-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Buat Tagihan</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices.map((inv) => {
                const waReminderMessage = `Halo ${inv.occupancy.tenant.name}, ini pengingat tagihan sewa kamar ${inv.occupancy.room.roomNumber} di ${inv.occupancy.room.property.name} periode ${MONTH_NAMES[inv.periodMonth - 1]} ${inv.periodYear} sebesar ${formatRupiah(inv.remainingBalance)}. Jatuh tempo pada ${formatDateIndonesia(inv.dueDate)}. Terima kasih.`;
                const waUrl = inv.occupancy.tenant.phone
                  ? createWhatsAppReminderUrl(inv.occupancy.tenant.phone, waReminderMessage)
                  : null;

                return (
                  <Card key={inv.id} className="flex flex-col justify-between hover:border-foreground/20 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">
                            {inv.invoiceNumber}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span>
                              Kamar {inv.occupancy.room.roomNumber} • {inv.occupancy.room.property.name}
                            </span>
                          </p>
                        </div>
                        {getStatusBadge(inv.status)}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Penghuni:</span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {inv.occupancy.tenant.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Jatuh Tempo:</span>
                          <span className="font-medium text-foreground">
                            {formatDateIndonesia(inv.dueDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-muted-foreground">Total Tagihan:</span>
                          <span className="font-bold text-foreground">{formatRupiah(inv.amount)}</span>
                        </div>
                        {inv.totalPaid > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>Sudah Dibayar:</span>
                            <span className="font-semibold">{formatRupiah(inv.totalPaid)}</span>
                          </div>
                        )}
                        {inv.remainingBalance > 0 && (
                          <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold">
                            <span>Sisa Tagihan:</span>
                            <span>{formatRupiah(inv.remainingBalance)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        {waUrl && inv.status !== "PAID" && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "ghost", size: "sm" }) + " text-emerald-600 dark:text-emerald-400 text-xs h-8 px-2"}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            <span>Kirim WA</span>
                          </a>
                        )}

                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8 ml-auto"}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>Rincian & Pembayaran</span>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content for Payments History Tab */}
      {activeTab === "payments" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Riwayat Transaksi Masuk</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {payments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                Belum ada transaksi pembayaran yang tercatat.
              </p>
            ) : (
              <div className="divide-y text-xs">
                {payments.map((p) => (
                  <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {formatRupiah(p.amount)}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {p.paymentMethod}
                        </Badge>
                        {p.isCancelled && (
                          <Badge variant="destructive" className="text-[10px]">
                            Dibatalkan
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Tagihan: {p.invoice?.invoiceNumber} • Penghuni: {p.invoice?.occupancy?.tenant?.name} (Kamar {p.invoice?.occupancy?.room?.roomNumber})
                      </p>
                      {p.notes && <p className="text-muted-foreground italic">&quot;{p.notes}&quot;</p>}
                      {p.isCancelled && p.cancelReason && (
                        <p className="text-destructive font-medium">Alasan Batal: {p.cancelReason}</p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground shrink-0">
                      {formatDateIndonesia(p.paidAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Buat Tagihan Individual */}
      <Dialog open={isSingleOpen} onOpenChange={setIsSingleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Tagihan Individual</DialogTitle>
            <DialogDescription>
              Terbitkan tagihan baru untuk satu unit kamar yang sedang aktif dihuni.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSingle} className="space-y-3 py-2">
            {singleError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {singleError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="s-occ" className="text-xs font-semibold">
                Pilih Kamar & Penghuni <span className="text-destructive">*</span>
              </label>
              {occupancies.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Tidak ada kamar yang sedang dihuni aktif. Tempatkan penghuni terlebih dahulu.
                </p>
              ) : (
                <select
                  id="s-occ"
                  value={singleData.occupancyId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const item = occupancies.find((o) => o.id === selId);
                    setSingleData({
                      ...singleData,
                      occupancyId: selId,
                      amount: item ? item.monthlyRent.toString() : singleData.amount,
                    });
                  }}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {occupancies.map((o) => (
                    <option key={o.id} value={o.id}>
                      Kamar {o.roomNumber} - {o.tenantName} ({o.propertyName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="s-month" className="text-xs font-semibold">Bulan Tagihan</label>
                <select
                  id="s-month"
                  value={singleData.periodMonth}
                  onChange={(e) => setSingleData({ ...singleData, periodMonth: parseInt(e.target.value) })}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="s-year" className="text-xs font-semibold">Tahun Tagihan</label>
                <Input
                  id="s-year"
                  type="number"
                  min="2020"
                  max="2100"
                  required
                  value={singleData.periodYear}
                  onChange={(e) => setSingleData({ ...singleData, periodYear: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="s-due" className="text-xs font-semibold">
                Tanggal Jatuh Tempo <span className="text-destructive">*</span>
              </label>
              <Input
                id="s-due"
                type="date"
                required
                value={singleData.dueDate}
                onChange={(e) => setSingleData({ ...singleData, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="s-amount" className="text-xs font-semibold">
                Nominal Tagihan (Rp) <span className="text-destructive">*</span>
              </label>
              <Input
                id="s-amount"
                type="number"
                min="10000"
                step="10000"
                required
                value={singleData.amount}
                onChange={(e) => setSingleData({ ...singleData, amount: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSingleOpen(false)}
                disabled={singleLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={singleLoading || occupancies.length === 0}>
                {singleLoading ? "Menerbitkan..." : "Terbitkan Tagihan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Terbitkan Tagihan Massal */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terbitkan Tagihan Massal</DialogTitle>
            <DialogDescription>
              Buat tagihan sewa sekaligus untuk seluruh penghuni aktif.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBulk} className="space-y-3 py-2">
            {bulkError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {bulkError}
              </div>
            )}

            {bulkResult && (
              <div className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                <p className="font-semibold">Penerbitan Tagihan Selesai:</p>
                <p>• Berhasil dibuat: {bulkResult.generatedCount} invoice baru</p>
                <p>• Dilewati (sudah ada): {bulkResult.skippedCount} invoice</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="b-month" className="text-xs font-semibold">Bulan Periode</label>
                <select
                  id="b-month"
                  value={bulkData.periodMonth}
                  onChange={(e) => setBulkData({ ...bulkData, periodMonth: parseInt(e.target.value) })}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="b-year" className="text-xs font-semibold">Tahun Periode</label>
                <Input
                  id="b-year"
                  type="number"
                  min="2020"
                  max="2100"
                  required
                  value={bulkData.periodYear}
                  onChange={(e) => setBulkData({ ...bulkData, periodYear: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {properties.length > 1 && (
              <div className="space-y-1">
                <label htmlFor="b-prop" className="text-xs font-semibold">Target Properti Kos</label>
                <select
                  id="b-prop"
                  value={bulkData.propertyId}
                  onChange={(e) => setBulkData({ ...bulkData, propertyId: e.target.value })}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">Semua Properti Kos</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>Aturan Idempotensi:</strong> Proses ini aman dijalankan berulang kali. Kamar yang sudah
                memiliki invoice pada periode ini tidak akan diduplikasi. Nilai tagihan disnapshot langsung dari
                kesepakatan sewa aktif penyewa saat ini.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkOpen(false)}
                disabled={bulkLoading}
              >
                Tutup
              </Button>
              <Button type="submit" disabled={bulkLoading}>
                {bulkLoading ? "Memproses..." : "Terbitkan Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BillingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <BillingPageContent />
    </React.Suspense>
  );
}
