"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  MessageCircle,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { InvoiceStatusType, PaymentMethodType } from "@/features/billing/types";

interface PaymentEntry {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: PaymentMethodType;
  notes: string | null;
  proofUrl: string | null;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancelReason: string | null;
}

interface InvoiceDetail {
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
    billingDueDay: number;
    tenant: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    };
    room: {
      id: string;
      roomNumber: string;
      type: string;
      property: {
        id: string;
        name: string;
        city: string;
      };
    };
  };
  payments: PaymentEntry[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function InvoiceDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: invoiceId } = React.use(params);

  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Record Payment Modal
  const [isPayOpen, setIsPayOpen] = React.useState(false);
  const [payLoading, setPayLoading] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [payData, setPayData] = React.useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER" as PaymentMethodType,
    paidAt: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Cancel Payment Modal
  const [paymentToCancel, setPaymentToCancel] = React.useState<PaymentEntry | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (!res.ok) throw new Error("Gagal mengambil data tagihan");
        const json = await res.json();
        if (!ignore && json.success) {
          setInvoice(json.data);
          setPayData((prev) => ({
            ...prev,
            amount: json.data.remainingBalance.toString(),
          }));
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat tagihan");
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
  }, [invoiceId, refreshKey]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError(null);

    const amountNum = parseFloat(payData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError("Nominal pembayaran harus lebih besar dari 0");
      setPayLoading(false);
      return;
    }

    if (invoice && amountNum > invoice.remainingBalance) {
      setPayError(
        `Nominal pembayaran tidak boleh melebihi sisa tagihan (${formatRupiah(invoice.remainingBalance)})`
      );
      setPayLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: amountNum,
          paymentMethod: payData.paymentMethod,
          paidAt: payData.paidAt,
          notes: payData.notes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal mencatat pembayaran");
      }

      setIsPayOpen(false);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setPayLoading(false);
    }
  };

  const handleCancelPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentToCancel) return;

    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError("Alasan pembatalan minimal 3 karakter");
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/payments/${paymentToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal membatalkan pembayaran");
      }

      setPaymentToCancel(null);
      setCancelReason("");
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="h-44 bg-card rounded-xl border animate-pulse"></div>
        <div className="h-48 bg-card rounded-xl border animate-pulse"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke menu tagihan</span>
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="text-sm font-medium">{error || "Tagihan tidak ditemukan"}</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: InvoiceStatusType) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Lunas</span>
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Dibayar Sebagian</span>
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Terlambat</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Belum Dibayar</span>
          </Badge>
        );
    }
  };

  const waReminderMessage = `Halo ${invoice.occupancy.tenant.name}, ini pengingat tagihan sewa Kamar ${invoice.occupancy.room.roomNumber} di ${invoice.occupancy.room.property.name} periode ${MONTH_NAMES[invoice.periodMonth - 1]} ${invoice.periodYear} sebesar ${formatRupiah(invoice.remainingBalance)}. Jatuh tempo pada ${formatDateIndonesia(invoice.dueDate)}. Terima kasih.`;
  const waUrl = invoice.occupancy.tenant.phone
    ? createWhatsAppReminderUrl(invoice.occupancy.tenant.phone, waReminderMessage)
    : null;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Tagihan</span>
        </Link>
      </div>

      {/* Invoice Header Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">{invoice.invoiceNumber}</CardTitle>
              {getStatusBadge(invoice.status)}
            </div>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Periode:</span>
              <strong className="text-foreground">
                {MONTH_NAMES[invoice.periodMonth - 1]} {invoice.periodYear}
              </strong>
              <span>• Jatuh Tempo:</span>
              <strong className="text-foreground">{formatDateIndonesia(invoice.dueDate)}</strong>
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {waUrl && invoice.status !== "PAID" && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Kirim Pengingat WA</span>
              </a>
            )}

            {invoice.remainingBalance > 0 && (
              <Button
                onClick={() => {
                  setPayError(null);
                  setIsPayOpen(true);
                }}
                className="gap-2 text-xs h-9"
              >
                <Plus className="h-4 w-4" />
                <span>Catat Pembayaran</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 border-t space-y-4">
          {/* Occupancy and Room Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
            <div className="rounded-lg bg-muted/30 p-3 space-y-1">
              <p className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Penyewa</span>
              </p>
              <Link
                href={`/dashboard/tenants/${invoice.occupancy.tenant.id}`}
                className="font-bold text-sm text-foreground hover:underline"
              >
                {invoice.occupancy.tenant.name}
              </Link>
              {invoice.occupancy.tenant.phone && (
                <p className="text-muted-foreground">{invoice.occupancy.tenant.phone}</p>
              )}
            </div>

            <div className="rounded-lg bg-muted/30 p-3 space-y-1">
              <p className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>Unit Kamar</span>
              </p>
              <Link
                href={`/dashboard/rooms/${invoice.occupancy.room.id}`}
                className="font-bold text-sm text-foreground hover:underline"
              >
                Kamar {invoice.occupancy.room.roomNumber} ({invoice.occupancy.room.type})
              </Link>
              <p className="text-muted-foreground">
                {invoice.occupancy.room.property.name} • {invoice.occupancy.room.property.city}
              </p>
            </div>
          </div>

          {/* Financial Totals Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="rounded-lg border p-3">
              <span className="text-muted-foreground">Total Tagihan (Snapshot):</span>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {formatRupiah(invoice.amount)}
              </p>
            </div>

            <div className="rounded-lg border p-3 bg-emerald-500/5 border-emerald-500/20">
              <span className="text-emerald-700 dark:text-emerald-300">Total Sudah Dibayar:</span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatRupiah(invoice.totalPaid)}
              </p>
            </div>

            <div className="rounded-lg border p-3 bg-amber-500/5 border-amber-500/20">
              <span className="text-amber-700 dark:text-amber-300">Sisa Tagihan:</span>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatRupiah(invoice.remainingBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Riwayat Pembayaran Tagihan Ini</CardTitle>
              <CardDescription className="text-xs">
                Seluruh rekaman penerimaan pembayaran, baik yang aktif maupun yang dibatalkan.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {invoice.payments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Belum ada pembayaran yang dicatat untuk tagihan ini.
            </p>
          ) : (
            <div className="divide-y text-xs">
              {invoice.payments.map((p) => (
                <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {formatRupiah(p.amount)}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {p.paymentMethod}
                      </Badge>
                      {p.isCancelled ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Dibatalkan
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
                          Valid
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Tanggal: {formatDateIndonesia(p.paidAt)}
                    </p>
                    {p.notes && <p className="text-muted-foreground italic">&quot;{p.notes}&quot;</p>}
                    {p.isCancelled && p.cancelReason && (
                      <p className="text-destructive font-medium">Alasan Batal: {p.cancelReason}</p>
                    )}
                  </div>

                  {!p.isCancelled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCancelError(null);
                        setCancelReason("");
                        setPaymentToCancel(p);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive h-8 px-2 shrink-0 self-start sm:self-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      <span>Batalkan</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Catat Pembayaran */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Tagihan</DialogTitle>
            <DialogDescription>
              Catat setoran sewa dari penyewa ke dalam sistem pembukuan kos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-3 py-2">
            {payError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {payError}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="pay-amt" className="font-semibold">
                  Nominal Pembayaran (Rp) <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPayData({ ...payData, amount: invoice.remainingBalance.toString() })}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  Bayar Penuh ({formatRupiah(invoice.remainingBalance)})
                </button>
              </div>
              <Input
                id="pay-amt"
                type="number"
                min="1000"
                max={invoice.remainingBalance}
                step="1000"
                required
                value={payData.amount}
                onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                placeholder={`Maksimal: ${invoice.remainingBalance}`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="pay-method" className="text-xs font-semibold">
                Metode Pembayaran <span className="text-destructive">*</span>
              </label>
              <select
                id="pay-method"
                value={payData.paymentMethod}
                onChange={(e) => setPayData({ ...payData, paymentMethod: e.target.value as PaymentMethodType })}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="BANK_TRANSFER">Transfer Bank</option>
                <option value="CASH">Tunai / Cash</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="pay-date" className="text-xs font-semibold">
                Tanggal Diterima <span className="text-destructive">*</span>
              </label>
              <Input
                id="pay-date"
                type="date"
                required
                value={payData.paidAt}
                onChange={(e) => setPayData({ ...payData, paidAt: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="pay-notes" className="text-xs font-semibold">
                Catatan / Referensi (Opsional)
              </label>
              <Input
                id="pay-notes"
                value={payData.notes}
                onChange={(e) => setPayData({ ...payData, notes: e.target.value })}
                placeholder="Contoh: Transfer Mandiri ref #98721"
              />
            </div>

            <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground leading-relaxed">
              <p>
                Pencatatan ini akan langsung diperhitungkan sebagai <strong>pemasukan riil</strong> dan
                mengurangi sisa tagihan secara atomik.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPayOpen(false)}
                disabled={payLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={payLoading}>
                {payLoading ? "Menyimpan..." : "Konfirmasi Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Batalkan Pembayaran (Reversal) */}
      <Dialog
        open={Boolean(paymentToCancel)}
        onOpenChange={(open) => !open && setPaymentToCancel(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan Pembayaran</DialogTitle>
            <DialogDescription>
              Batalkan rekaman pembayaran sebesar{" "}
              <strong className="text-foreground">
                {paymentToCancel ? formatRupiah(paymentToCancel.amount) : "Rp 0"}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelPayment} className="space-y-3 py-2">
            {cancelError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {cancelError}
              </div>
            )}

            <div className="py-1 text-xs text-muted-foreground leading-relaxed space-y-1.5">
              <p>
                Sesuai standar audit SewaLokal, pembayaran tidak akan dihapus dari riwayat transaksi.
                Namun statusnya akan ditandai sebagai <strong>Dibatalkan</strong>, dan nilai sisa tagihan
                akan otomatis dipulihkan.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="cancel-reason" className="text-xs font-semibold">
                Alasan Pembatalan <span className="text-destructive">*</span>
              </label>
              <Input
                id="cancel-reason"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Salah input nominal / transfer ditolak bank"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentToCancel(null)}
                disabled={cancelLoading}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelLoading}
              >
                {cancelLoading ? "Memproses..." : "Ya, Batalkan Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoiceDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-44 bg-card rounded-xl border animate-pulse"></div>
          <div className="h-48 bg-card rounded-xl border animate-pulse"></div>
        </div>
      }
    >
      <InvoiceDetailContent params={props.params} />
    </React.Suspense>
  );
}
