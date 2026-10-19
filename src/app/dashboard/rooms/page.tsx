"use client";

import * as React from "react";
import Link from "next/link";
import {
  DoorOpen,
  Search,
  Plus,
  Eye,
  AlertCircle,
  Building2,
  User,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import { formatRupiah } from "@/lib/formatters";

interface PropertySummary {
  id: string;
  name: string;
  city: string;
}

interface RoomItem {
  id: string;
  propertyId: string;
  roomNumber: string;
  type: string;
  monthlyRate: number;
  status: "VACANT" | "OCCUPIED" | "MAINTENANCE";
  facilities: string[];
  notes?: string | null;
  property: PropertySummary;
  occupancies?: Array<{
    tenant?: {
      id: string;
      name: string;
      phone: string | null;
    };
  }>;
}

export default function RoomsPage() {
  const [rooms, setRooms] = React.useState<RoomItem[]>([]);
  const [properties, setProperties] = React.useState<PropertySummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [propertyFilter, setPropertyFilter] = React.useState<string>("ALL");

  // Add Room Modal
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addLoading, setAddLoading] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [addData, setAddData] = React.useState({
    propertyId: "",
    roomNumber: "",
    type: "Standard",
    monthlyRate: "",
    notes: "",
  });

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        // Fetch properties for filter dropdown & room creation
        const propsRes = await fetch("/api/properties");
        if (propsRes.ok) {
          const propsData = await propsRes.json();
          if (!ignore && propsData.success) {
            setProperties(propsData.data);
            setAddData((prev) => {
              if (propsData.data.length > 0 && !prev.propertyId) {
                return { ...prev, propertyId: propsData.data[0].id };
              }
              return prev;
            });
          }
        }

        // Fetch rooms
        const queryParams = new URLSearchParams();
        if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
        if (propertyFilter !== "ALL") queryParams.set("propertyId", propertyFilter);
        if (searchTerm.trim()) queryParams.set("search", searchTerm.trim());

        const res = await fetch(`/api/rooms?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil data kamar");

        const result = await res.json();
        if (!ignore && result.success) {
          setRooms(result.data);
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
  }, [statusFilter, propertyFilter, searchTerm, refreshKey]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    const rate = parseFloat(addData.monthlyRate);
    if (isNaN(rate) || rate <= 0) {
      setAddError("Harga sewa harus lebih besar dari 0");
      setAddLoading(false);
      return;
    }

    if (!addData.propertyId) {
      setAddError("Pilih properti kos terlebih dahulu");
      setAddLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: addData.propertyId,
          roomNumber: addData.roomNumber,
          type: addData.type,
          monthlyRate: rate,
          notes: addData.notes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menambahkan kamar");
      }

      setIsAddOpen(false);
      setAddData((prev) => ({
        ...prev,
        roomNumber: "",
        type: "Standard",
        monthlyRate: "",
        notes: "",
      }));
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manajemen Kamar Kos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau ketersediaan seluruh unit kamar, penghuni aktif, dan tarif sewa.
          </p>
        </div>
        <Button
          onClick={() => {
            setAddError(null);
            setIsAddOpen(true);
          }}
          disabled={properties.length === 0}
          className="gap-2 shrink-0 self-start sm:self-auto min-h-[40px]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kamar</span>
        </Button>
      </div>

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

      {/* Notice if no property exists */}
      {properties.length === 0 && !loading && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs">
              Anda belum memiliki properti kos. Silakan buat properti terlebih dahulu pada menu{" "}
              <Link href="/dashboard/properties" className="font-semibold underline">
                Properti Kos
              </Link>{" "}
              sebelum menambahkan kamar.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor atau tipe kamar..."
            className="pl-9 text-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status kamar"
          className="h-8 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">Semua Status</option>
          <option value="VACANT">Kosong</option>
          <option value="OCCUPIED">Terisi</option>
          <option value="MAINTENANCE">Pemeliharaan</option>
        </select>

        {/* Property filter */}
        {properties.length > 1 && (
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            aria-label="Filter lokasi kos"
            className="h-8 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">Semua Lokasi Kos</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.city})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border bg-card/60 animate-pulse p-5 space-y-3"
            >
              <div className="h-5 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
              <DoorOpen className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base">Tidak ada kamar ditemukan</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {searchTerm || statusFilter !== "ALL" || propertyFilter !== "ALL"
                ? "Tidak ada kamar yang sesuai dengan kriteria pencarian atau filter yang dipilih."
                : "Belum ada unit kamar yang didaftarkan pada kos Anda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const isOccupied = room.status === "OCCUPIED";
            const isVacant = room.status === "VACANT";
            const activeTenant = room.occupancies?.[0]?.tenant;

            return (
              <Card key={room.id} className="flex flex-col justify-between hover:border-foreground/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold">
                        Kamar {room.roomNumber}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span>{room.property?.name}</span>
                      </CardDescription>
                    </div>
                    <Badge
                      variant={isOccupied ? "default" : isVacant ? "outline" : "secondary"}
                      className="text-[11px] shrink-0"
                    >
                      {isOccupied ? "Terisi" : isVacant ? "Kosong" : "Pemeliharaan"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="text-sm font-semibold text-foreground">
                    {formatRupiah(room.monthlyRate)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">/ bulan</span>
                  </div>

                  <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">Tipe:</span> {room.type}
                    </div>
                    {isOccupied && activeTenant ? (
                      <div className="flex items-center gap-1.5 text-primary font-medium">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Penghuni: {activeTenant.name}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <span>Siap disewa</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t flex justify-end">
                    <Link
                      href={`/dashboard/rooms/${room.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8"}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>Kelola Kamar</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Kamar */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kamar Baru</DialogTitle>
            <DialogDescription>
              Tentukan nomor kamar, kos penempatan, dan tarif sewa bulanan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRoom} className="space-y-3 py-2">
            {addError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {addError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="select-prop" className="text-xs font-semibold">
                Pilih Kos <span className="text-destructive">*</span>
              </label>
              <select
                id="select-prop"
                value={addData.propertyId}
                onChange={(e) => setAddData({ ...addData, propertyId: e.target.value })}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="add-room-no" className="text-xs font-semibold">
                Nomor / Nama Kamar <span className="text-destructive">*</span>
              </label>
              <Input
                id="add-room-no"
                required
                value={addData.roomNumber}
                onChange={(e) => setAddData({ ...addData, roomNumber: e.target.value })}
                placeholder="Contoh: 102, Lt2-01"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-type" className="text-xs font-semibold">
                Tipe Kamar
              </label>
              <Input
                id="add-type"
                value={addData.type}
                onChange={(e) => setAddData({ ...addData, type: e.target.value })}
                placeholder="Standard, VIP, AC"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-rate" className="text-xs font-semibold">
                Tarif Bulanan (Rp) <span className="text-destructive">*</span>
              </label>
              <Input
                id="add-rate"
                type="number"
                min="10000"
                step="10000"
                required
                value={addData.monthlyRate}
                onChange={(e) => setAddData({ ...addData, monthlyRate: e.target.value })}
                placeholder="1500000"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-notes" className="text-xs font-semibold">
                Catatan Kamar (Opsional)
              </label>
              <Input
                id="add-notes"
                value={addData.notes}
                onChange={(e) => setAddData({ ...addData, notes: e.target.value })}
                placeholder="Termasuk kasur dan lemari"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={addLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? "Menyimpan..." : "Simpan Kamar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
