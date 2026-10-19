"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DoorOpen,
  Building2,
  Edit,
  Archive,
  UserCheck,
  LogOut,
  Phone,
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

interface TenantSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface OccupancyItem {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  billingDueDay: number;
  depositAmount: number;
  monthlyRent: number;
  status: "ACTIVE" | "TERMINATED";
  tenant: TenantSummary;
}

interface RoomDetail {
  id: string;
  propertyId: string;
  roomNumber: string;
  type: string;
  monthlyRate: number;
  status: "VACANT" | "OCCUPIED" | "MAINTENANCE";
  facilities: string[];
  notes: string | null;
  property: {
    id: string;
    name: string;
    city: string;
    address: string;
  };
  occupancies: OccupancyItem[];
}

function RoomDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = React.use(params);
  const router = useRouter();

  const [room, setRoom] = React.useState<RoomDetail | null>(null);
  const [tenants, setTenants] = React.useState<TenantSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Edit Room Modal
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editData, setEditData] = React.useState({
    roomNumber: "",
    type: "Standard",
    monthlyRate: "",
    notes: "",
    status: "VACANT",
  });

  // Archive Modal
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);
  const [archiveLoading, setArchiveLoading] = React.useState(false);

  // Check-in Modal
  const [isCheckinOpen, setIsCheckinOpen] = React.useState(false);
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [checkinError, setCheckinError] = React.useState<string | null>(null);
  const [checkinData, setCheckinData] = React.useState({
    tenantId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    billingDueDay: 1,
    depositAmount: "0",
    monthlyRent: "",
  });

  // Check-out Modal
  const [occupancyToCheckout, setOccupancyToCheckout] = React.useState<OccupancyItem | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (!res.ok) throw new Error("Gagal mengambil data kamar");
        const data = await res.json();
        if (!ignore && data.success) {
          setRoom(data.data);
          setEditData({
            roomNumber: data.data.roomNumber,
            type: data.data.type,
            monthlyRate: data.data.monthlyRate.toString(),
            notes: data.data.notes || "",
            status: data.data.status,
          });
          setCheckinData((prev) => ({
            ...prev,
            monthlyRent: data.data.monthlyRate.toString(),
          }));
        }

        // Fetch tenants for checkin selection
        const tenantsRes = await fetch("/api/tenants");
        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          if (!ignore && tenantsData.success) {
            setTenants(tenantsData.data);
            setCheckinData((prev) => {
              if (tenantsData.data.length > 0 && !prev.tenantId) {
                return { ...prev, tenantId: tenantsData.data[0].id };
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
  }, [roomId, refreshKey]);

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    const rate = parseFloat(editData.monthlyRate);

    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: editData.roomNumber,
          type: editData.type,
          monthlyRate: rate,
          notes: editData.notes || undefined,
          status: editData.status,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Gagal memperbarui kamar");
      setIsEditOpen(false);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui kamar");
    } finally {
      setEditLoading(false);
    }
  };

  const handleArchiveRoom = async () => {
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Gagal mengarsipkan kamar");
      router.push(`/dashboard/properties/${room?.propertyId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengarsipkan kamar");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinLoading(true);
    setCheckinError(null);

    const rent = parseFloat(checkinData.monthlyRent);
    const deposit = parseFloat(checkinData.depositAmount) || 0;

    if (!checkinData.tenantId) {
      setCheckinError("Silakan pilih penghuni terlebih dahulu");
      setCheckinLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/occupancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          tenantId: checkinData.tenantId,
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

  if (error || !room) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/rooms"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke daftar kamar</span>
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="text-sm font-medium">{error || "Kamar tidak ditemukan"}</p>
        </div>
      </div>
    );
  }

  const activeOccupancy = room.occupancies?.find((o) => o.status === "ACTIVE");
  const pastOccupancies = room.occupancies?.filter((o) => o.status === "TERMINATED") || [];

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href="/dashboard/rooms"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Kamar</span>
        </Link>
      </div>

      {/* Room Header Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">Kamar {room.roomNumber}</CardTitle>
              <Badge
                variant={room.status === "OCCUPIED" ? "default" : room.status === "VACANT" ? "outline" : "secondary"}
              >
                {room.status === "OCCUPIED" ? "Terisi" : room.status === "VACANT" ? "Kosong" : "Pemeliharaan"}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <Link
                href={`/dashboard/properties/${room.property.id}`}
                className="hover:underline text-foreground font-medium"
              >
                {room.property.name}
              </Link>
              <span>• {room.property.city}</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="gap-2 text-xs h-8"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Kamar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsArchiveOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              <span>Arsipkan</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 border-t space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Tipe Kamar:</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">{room.type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tarif Standar Bulanan:</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                {formatRupiah(room.monthlyRate)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Catatan Tambahan:</span>
              <p className="text-foreground text-xs mt-0.5">{room.notes || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Occupancy / Tenant Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Status Hunian Saat Ini</CardTitle>
              <CardDescription className="text-xs">
                Informasi penyewa yang saat ini menempati unit kamar.
              </CardDescription>
            </div>

            {room.status === "VACANT" && (
              <Button
                onClick={() => {
                  setCheckinError(null);
                  setIsCheckinOpen(true);
                }}
                size="sm"
                className="gap-2 text-xs"
              >
                <UserCheck className="h-4 w-4" />
                <span>Tempatkan Penghuni (Check-in)</span>
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
                    {activeOccupancy.tenant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link
                      href={`/dashboard/tenants/${activeOccupancy.tenant.id}`}
                      className="font-bold text-sm text-foreground hover:underline"
                    >
                      {activeOccupancy.tenant.name}
                    </Link>
                    {activeOccupancy.tenant.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        <span>{activeOccupancy.tenant.phone}</span>
                      </p>
                    )}
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
                  <span className="text-muted-foreground">Jatuh Tempo Tiap Tanggal:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    Tanggal {activeOccupancy.billingDueDay}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Harga Sewa Aktif:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatRupiah(activeOccupancy.monthlyRent)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uang Jaminan (Deposit):</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatRupiah(activeOccupancy.depositAmount)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <DoorOpen className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">Kamar ini belum dihuni</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Kamar siap disewakan. Klik tombol Check-in di atas untuk menempatkan penghuni.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Riwayat Sewa Kamar</CardTitle>
          <CardDescription className="text-xs">
            Catatan seluruh masa sewa lampau pada unit ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {pastOccupancies.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Belum ada riwayat sewa lampau untuk kamar ini.
            </p>
          ) : (
            <div className="divide-y text-xs">
              {pastOccupancies.map((past) => (
                <div key={past.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{past.tenant.name}</p>
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

      {/* Modal Edit Kamar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Unit Kamar</DialogTitle>
            <DialogDescription>
              Perbarui rincian kamar {room.roomNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditRoom} className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="edit-room-no" className="text-xs font-semibold">Nomor Kamar</label>
              <Input
                id="edit-room-no"
                required
                value={editData.roomNumber}
                onChange={(e) => setEditData({ ...editData, roomNumber: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-room-type" className="text-xs font-semibold">Tipe Kamar</label>
              <Input
                id="edit-room-type"
                value={editData.type}
                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-room-rate" className="text-xs font-semibold">Tarif Sewa (Rp)</label>
              <Input
                id="edit-room-rate"
                type="number"
                required
                value={editData.monthlyRate}
                onChange={(e) => setEditData({ ...editData, monthlyRate: e.target.value })}
              />
            </div>

            {room.status !== "OCCUPIED" && (
              <div className="space-y-1">
                <label htmlFor="edit-room-status" className="text-xs font-semibold">Status Kamar</label>
                <select
                  id="edit-room-status"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="VACANT">Kosong</option>
                  <option value="MAINTENANCE">Pemeliharaan / Perbaikan</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="edit-room-notes" className="text-xs font-semibold">Catatan</label>
              <Input
                id="edit-room-notes"
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

      {/* Modal Check-in Penghuni */}
      <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tempatkan Penghuni (Check-in)</DialogTitle>
            <DialogDescription>
              Tautkan penyewa ke Kamar {room.roomNumber} dan tentukan ketentuan masa sewa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckin} className="space-y-3 py-2">
            {checkinError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {checkinError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="checkin-tenant" className="text-xs font-semibold">
                Pilih Penghuni <span className="text-destructive">*</span>
              </label>
              {tenants.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Belum ada penghuni terdaftar. Silakan tambahkan penghuni terlebih dahulu di menu Data Penghuni.
                </p>
              ) : (
                <select
                  id="checkin-tenant"
                  value={checkinData.tenantId}
                  onChange={(e) => setCheckinData({ ...checkinData, tenantId: e.target.value })}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">-- Pilih Penghuni --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.phone ? `(${t.phone})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="checkin-start" className="text-xs font-semibold">
                Tanggal Mulai Sewa <span className="text-destructive">*</span>
              </label>
              <Input
                id="checkin-start"
                type="date"
                required
                value={checkinData.startDate}
                onChange={(e) => setCheckinData({ ...checkinData, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="checkin-end" className="text-xs font-semibold">
                Tanggal Berakhir Sewa (Opsional)
              </label>
              <Input
                id="checkin-end"
                type="date"
                value={checkinData.endDate}
                onChange={(e) => setCheckinData({ ...checkinData, endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="checkin-rent" className="text-xs font-semibold">
                  Tarif Sewa (Rp) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="checkin-rent"
                  type="number"
                  required
                  value={checkinData.monthlyRent}
                  onChange={(e) => setCheckinData({ ...checkinData, monthlyRent: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="checkin-due" className="text-xs font-semibold">
                  Jatuh Tempo (Tgl 1-31)
                </label>
                <Input
                  id="checkin-due"
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
              <label htmlFor="checkin-deposit" className="text-xs font-semibold">
                Uang Jaminan / Deposit (Rp)
              </label>
              <Input
                id="checkin-deposit"
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
              <Button type="submit" disabled={checkinLoading || tenants.length === 0}>
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
            <DialogTitle>Konfirmasi Check-out Penyewa</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyelesaikan sewa penghuni{" "}
              <strong className="text-foreground">{occupancyToCheckout?.tenant.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              Tindakan ini akan mengakhiri masa aktif sewa penyewa pada Kamar {room.roomNumber} dan
              mengembalikan status kamar menjadi <strong>Kosong</strong>.
            </p>
            <p>
              Seluruh riwayat pembayaran, data penghuni, dan invoice yang telah tercatat tetap
              tersimpan aman dalam database.
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

      {/* Modal Konfirmasi Arsip Kamar */}
      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Arsipkan Kamar</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengarsipkan Kamar {room.roomNumber}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Kamar yang diarsipkan akan disembunyikan dari daftar aktif operasional, namun seluruh
              riwayat keuangan tetap terjaga.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsArchiveOpen(false)}
              disabled={archiveLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleArchiveRoom}
              disabled={archiveLoading}
            >
              {archiveLoading ? "Memproses..." : "Ya, Arsipkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RoomDetailPage(props: {
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
      <RoomDetailContent params={props.params} />
    </React.Suspense>
  );
}

