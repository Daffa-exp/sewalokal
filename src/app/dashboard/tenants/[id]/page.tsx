"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  DoorOpen,
  Edit,
  UserCheck,
  LogOut,
  Building2,
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
import { formatRupiah, formatDateIndonesia } from "@/lib/formatters";

interface OccupancyHistory {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string | null;
  billingDueDay: number;
  depositAmount: number;
  monthlyRent: number;
  status: "ACTIVE" | "TERMINATED";
  room: {
    id: string;
    roomNumber: string;
    monthlyRate: number;
    property: {
      id: string;
      name: string;
      city: string;
    };
  };
}

interface TenantDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  emergencyContact: string | null;
  notes: string | null;
  occupancies: OccupancyHistory[];
}

interface VacantRoom {
  id: string;
  roomNumber: string;
  monthlyRate: number;
  property: {
    id: string;
    name: string;
  };
}

function TenantDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tenantId } = React.use(params);

  const [tenant, setTenant] = React.useState<TenantDetail | null>(null);
  const [vacantRooms, setVacantRooms] = React.useState<VacantRoom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editData, setEditData] = React.useState({
    name: "",
    phone: "",
    email: "",
    emergencyContact: "",
    notes: "",
  });

  // Check-in Modal
  const [isCheckinOpen, setIsCheckinOpen] = React.useState(false);
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [checkinError, setCheckinError] = React.useState<string | null>(null);
  const [checkinData, setCheckinData] = React.useState({
    roomId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    billingDueDay: 1,
    depositAmount: "0",
    monthlyRent: "",
  });

  // Check-out Modal
  const [occupancyToCheckout, setOccupancyToCheckout] = React.useState<OccupancyHistory | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tenants/${tenantId}`);
        if (!res.ok) throw new Error("Gagal mengambil data penghuni");
        const data = await res.json();
        if (!ignore && data.success) {
          setTenant(data.data);
          setEditData({
            name: data.data.name || "",
            phone: data.data.phone || "",
            email: data.data.email || "",
            emergencyContact: data.data.emergencyContact || "",
            notes: data.data.notes || "",
          });
        }

        // Fetch vacant rooms for check-in
        const roomsRes = await fetch("/api/rooms?status=VACANT");
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          if (!ignore && roomsData.success) {
            setVacantRooms(roomsData.data);
            setCheckinData((prev) => {
              if (roomsData.data.length > 0 && !prev.roomId) {
                return {
                  ...prev,
                  roomId: roomsData.data[0].id,
                  monthlyRent: roomsData.data[0].monthlyRate.toString(),
                };
              }
              return prev;
            });
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
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
  }, [tenantId, refreshKey]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Gagal memperbarui penghuni");
      setIsEditOpen(false);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui penghuni");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinLoading(true);
    setCheckinError(null);

    const rent = parseFloat(checkinData.monthlyRent);
    const deposit = parseFloat(checkinData.depositAmount) || 0;

    if (!checkinData.roomId) {
      setCheckinError("Silakan pilih unit kamar terlebih dahulu");
      setCheckinLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/occupancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: checkinData.roomId,
          tenantId,
          startDate: checkinData.startDate,
          endDate: checkinData.endDate || undefined,
          billingDueDay: Number(checkinData.billingDueDay),
          depositAmount: deposit,
          monthlyRent: rent,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menempatkan penghuni");
      }

      setIsCheckinOpen(false);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setCheckinError(err instanceof Error ? err.message : "Terjadi kesalahan saat check-in");
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!occupancyToCheckout) return;
    setCheckoutLoading(true);

    try {
      const res = await fetch(`/api/occupancies/${occupancyToCheckout.id}/checkout`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal melakukan check-out");
      }

      setOccupancyToCheckout(null);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal melakukan check-out");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="h-36 bg-card rounded-xl border animate-pulse"></div>
        <div className="h-48 bg-card rounded-xl border animate-pulse"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke daftar penghuni</span>
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="text-sm font-medium">{error || "Data penghuni tidak ditemukan"}</p>
        </div>
      </div>
    );
  }

  const activeOccupancy = tenant.occupancies?.find((o) => o.status === "ACTIVE");
  const pastOccupancies = tenant.occupancies?.filter((o) => o.status === "TERMINATED") || [];

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Penghuni</span>
        </Link>
      </div>

      {/* Header Profile Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">{tenant.name}</CardTitle>
              <Badge variant={activeOccupancy ? "default" : "outline"}>
                {activeOccupancy ? "Aktif Menyewa" : "Tidak Ada Kamar Aktif"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              ID Penyewa: {tenant.id}
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="gap-2 text-xs h-8 shrink-0 self-start sm:self-auto"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Kontak</span>
          </Button>
        </CardHeader>

        <CardContent className="pt-0 border-t space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Nomor Telepon / WhatsApp:</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                {tenant.phone || "Belum dicatat"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                {tenant.email || "Belum dicatat"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Kontak Darurat:</span>
              <p className="text-foreground text-xs mt-0.5">
                {tenant.emergencyContact || "-"}
              </p>
            </div>
          </div>

          {tenant.notes && (
            <p className="text-xs text-muted-foreground pt-1">
              <strong className="text-foreground">Catatan:</strong> {tenant.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active Room Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Kamar yang Ditempati</CardTitle>
              <CardDescription className="text-xs">
                Informasi kamar aktif dan ketentuan sewa penghuni ini.
              </CardDescription>
            </div>

            {!activeOccupancy && (
              <Button
                onClick={() => {
                  setCheckinError(null);
                  setIsCheckinOpen(true);
                }}
                disabled={vacantRooms.length === 0}
                size="sm"
                className="gap-2 text-xs"
              >
                <UserCheck className="h-4 w-4" />
                <span>Tempatkan ke Kamar (Check-in)</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {activeOccupancy ? (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <Link
                      href={`/dashboard/rooms/${activeOccupancy.room.id}`}
                      className="font-bold text-sm text-foreground hover:underline"
                    >
                      Kamar {activeOccupancy.room.roomNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      <span>
                        {activeOccupancy.room.property.name} ({activeOccupancy.room.property.city})
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setOccupancyToCheckout(activeOccupancy)}
                  className="gap-2 text-xs h-8 shrink-0 self-start sm:self-auto"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Selesaikan Sewa (Check-out)</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t text-xs">
                <div>
                  <span className="text-muted-foreground">Mulai Sewa:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatDateIndonesia(activeOccupancy.startDate)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Jatuh Tempo:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    Tiap tanggal {activeOccupancy.billingDueDay}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tarif Sewa:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatRupiah(activeOccupancy.monthlyRent)} / bln
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uang Deposit:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatRupiah(activeOccupancy.depositAmount)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                Penghuni belum memiliki kamar aktif
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {vacantRooms.length > 0
                  ? "Tersedia kamar kosong yang dapat ditempati sekarang."
                  : "Saat ini tidak ada unit kamar kosong yang tersedia untuk ditempati."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Riwayat Sewa Penghuni</CardTitle>
          <CardDescription className="text-xs">
            Daftar kamar yang pernah ditempati sebelumnya oleh {tenant.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {pastOccupancies.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Belum ada riwayat sewa lampau untuk penghuni ini.
            </p>
          ) : (
            <div className="divide-y text-xs">
              {pastOccupancies.map((past) => (
                <div key={past.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Kamar {past.room.roomNumber} ({past.room.property.name})
                    </p>
                    <p className="text-muted-foreground">
                      {formatDateIndonesia(past.startDate)} s.d.{" "}
                      {past.endDate ? formatDateIndonesia(past.endDate) : "Selesai"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Selesai
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatRupiah(past.monthlyRent)} / bln
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Edit Penghuni */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Kontak Penghuni</DialogTitle>
            <DialogDescription>
              Perbarui rincian kontak dan catatan penghuni.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="edit-t-name" className="text-xs font-semibold">Nama Lengkap</label>
              <Input
                id="edit-t-name"
                required
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-t-phone" className="text-xs font-semibold">Nomor Telepon / WA</label>
              <Input
                id="edit-t-phone"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-t-email" className="text-xs font-semibold">Email</label>
              <Input
                id="edit-t-email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-t-emerg" className="text-xs font-semibold">Kontak Darurat</label>
              <Input
                id="edit-t-emerg"
                value={editData.emergencyContact}
                onChange={(e) => setEditData({ ...editData, emergencyContact: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-t-notes" className="text-xs font-semibold">Catatan</label>
              <Input
                id="edit-t-notes"
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={editLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Check-in ke Kamar */}
      <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tempatkan Penghuni ke Kamar</DialogTitle>
            <DialogDescription>
              Pilih unit kamar kosong untuk {tenant.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckin} className="space-y-3 py-2">
            {checkinError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {checkinError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="checkin-r" className="text-xs font-semibold">
                Pilih Kamar Kosong <span className="text-destructive">*</span>
              </label>
              <select
                id="checkin-r"
                value={checkinData.roomId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const roomObj = vacantRooms.find((r) => r.id === selectedId);
                  setCheckinData({
                    ...checkinData,
                    roomId: selectedId,
                    monthlyRent: roomObj ? roomObj.monthlyRate.toString() : checkinData.monthlyRent,
                  });
                }}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {vacantRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Kamar {r.roomNumber} - {r.property.name} ({formatRupiah(r.monthlyRate)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="checkin-t-start" className="text-xs font-semibold">
                Tanggal Mulai Sewa <span className="text-destructive">*</span>
              </label>
              <Input
                id="checkin-t-start"
                type="date"
                required
                value={checkinData.startDate}
                onChange={(e) => setCheckinData({ ...checkinData, startDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="checkin-t-rent" className="text-xs font-semibold">
                  Tarif Sewa (Rp) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="checkin-t-rent"
                  type="number"
                  required
                  value={checkinData.monthlyRent}
                  onChange={(e) => setCheckinData({ ...checkinData, monthlyRent: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="checkin-t-due" className="text-xs font-semibold">
                  Jatuh Tempo (Tgl 1-31)
                </label>
                <Input
                  id="checkin-t-due"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={checkinData.billingDueDay}
                  onChange={(e) =>
                    setCheckinData({ ...checkinData, billingDueDay: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="checkin-t-dep" className="text-xs font-semibold">
                Deposit (Rp)
              </label>
              <Input
                id="checkin-t-dep"
                type="number"
                min="0"
                value={checkinData.depositAmount}
                onChange={(e) => setCheckinData({ ...checkinData, depositAmount: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCheckinOpen(false)}
                disabled={checkinLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={checkinLoading}>
                {checkinLoading ? "Menyimpan..." : "Konfirmasi Check-in"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Check-out */}
      <Dialog
        open={Boolean(occupancyToCheckout)}
        onOpenChange={(open) => !open && setOccupancyToCheckout(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Check-out</DialogTitle>
            <DialogDescription>
              Akhiri masa sewa {tenant.name} pada Kamar {occupancyToCheckout?.room.roomNumber}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              Kamar {occupancyToCheckout?.room.roomNumber} akan kembali berstatus <strong>Kosong</strong>{" "}
              dan siap disewakan kembali.
            </p>
            <p>
              Seluruh riwayat pembayaran dan tagihan lampau tetap tersimpan aman.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOccupancyToCheckout(null)}
              disabled={checkoutLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "Memproses..." : "Ya, Selesaikan Sewa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TenantDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-36 bg-card rounded-xl border animate-pulse"></div>
          <div className="h-48 bg-card rounded-xl border animate-pulse"></div>
        </div>
      }
    >
      <TenantDetailContent params={props.params} />
    </React.Suspense>
  );
}

