"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Edit,
  DoorOpen,
  Eye,
  ImageIcon,
  Upload,
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

interface Room {
  id: string;
  roomNumber: string;
  type: string;
  monthlyRate: number;
  status: "VACANT" | "OCCUPIED" | "MAINTENANCE";
  facilities: string[];
  notes?: string | null;
  occupancies?: Array<{
    id: string;
    status: string;
    tenant?: { id: string; name: string; phone: string | null };
  }>;
}

interface PropertyDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  description?: string | null;
  rules?: string | null;
  imageUrl?: string | null;
  rooms: Room[];
}

function PropertyDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: propertyId } = React.use(params);

  const [property, setProperty] = React.useState<PropertyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Photo upload state
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal mengunggah foto");
      }
      // Persist imageUrl to property
      const putRes = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: result.url }),
      });
      const putResult = await putRes.json();
      if (!putRes.ok || !putResult.success) {
        throw new Error(putResult.error || "Gagal menyimpan foto");
      }
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Edit property modal
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editData, setEditData] = React.useState({
    name: "",
    address: "",
    city: "",
    description: "",
    rules: "",
  });

  // Add room modal
  const [isAddRoomOpen, setIsAddRoomOpen] = React.useState(false);
  const [roomLoading, setRoomLoading] = React.useState(false);
  const [roomError, setRoomError] = React.useState<string | null>(null);
  const [roomData, setRoomData] = React.useState({
    roomNumber: "",
    type: "Standard",
    monthlyRate: "",
    notes: "",
  });

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/properties/${propertyId}`);
        if (!res.ok) throw new Error("Gagal mengambil data properti");
        const data = await res.json();
        if (!ignore && data.success) {
          setProperty(data.data);
          setEditData({
            name: data.data.name || "",
            address: data.data.address || "",
            city: data.data.city || "",
            description: data.data.description || "",
            rules: data.data.rules || "",
          });
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
  }, [propertyId, refreshKey]);

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal memperbarui properti");
      }
      setIsEditOpen(false);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomLoading(true);
    setRoomError(null);

    const rate = parseFloat(roomData.monthlyRate);
    if (isNaN(rate) || rate <= 0) {
      setRoomError("Harga sewa harus lebih dari 0");
      setRoomLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          roomNumber: roomData.roomNumber,
          type: roomData.type,
          monthlyRate: rate,
          notes: roomData.notes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menambahkan kamar");
      }

      setIsAddRoomOpen(false);
      setRoomData({ roomNumber: "", type: "Standard", monthlyRate: "", notes: "" });
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setRoomError(err instanceof Error ? err.message : "Gagal menambahkan kamar");
    } finally {
      setRoomLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="h-32 bg-card rounded-xl border animate-pulse"></div>
        <div className="h-64 bg-card rounded-xl border animate-pulse"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke daftar properti</span>
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="text-sm font-medium">{error || "Properti tidak ditemukan"}</p>
        </div>
      </div>
    );
  }

  const rooms = property.rooms || [];

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Properti</span>
        </Link>
      </div>

      {/* Property Details Header Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">{property.name}</CardTitle>
              <Badge variant="outline">{property.city}</Badge>
            </div>
            <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{property.address}</span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="gap-2 shrink-0 self-start sm:self-auto"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Properti</span>
          </Button>
        </CardHeader>

        {(property.description || property.rules) && (
          <CardContent className="pt-0 border-t space-y-2 text-xs">
            {property.description && (
              <p className="text-muted-foreground pt-3">
                <strong className="text-foreground">Deskripsi:</strong> {property.description}
              </p>
            )}
            {property.rules && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Peraturan:</strong> {property.rules}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Photo Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Foto Utama Properti
            </CardTitle>
            <div className="flex items-center gap-2">
              {uploadError && (
                <span className="text-xs text-destructive">{uploadError}</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
                aria-label="Unggah foto properti"
              />
              <button
                type="button"
                disabled={uploadLoading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadLoading ? "Mengunggah..." : property.imageUrl ? "Ganti Foto" : "Unggah Foto"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {property.imageUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <img
                src={property.imageUrl}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <img
                src="/properties/property-placeholder.svg"
                alt="Placeholder properti"
                className="h-20 w-20 opacity-40"
              />
              <p className="text-xs">Belum ada foto. Unggah untuk ditampilkan di dashboard.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rooms Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">Unit Kamar ({rooms.length})</h2>
            <p className="text-xs text-muted-foreground">
              Daftar kamar, status hunian, dan tarif sewa pada properti ini.
            </p>
          </div>
          <Button
            onClick={() => {
              setRoomError(null);
              setIsAddRoomOpen(true);
            }}
            size="sm"
            className="gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kamar</span>
          </Button>
        </div>

        {rooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2 text-muted-foreground">
                <DoorOpen className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm">Belum ada unit kamar</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Tambahkan nomor atau nama kamar untuk mulai mengelola penyewaan.
              </p>
              <Button
                onClick={() => setIsAddRoomOpen(true)}
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Kamar Pertama</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const isOccupied = room.status === "OCCUPIED";
              const isVacant = room.status === "VACANT";

              return (
                <Card key={room.id} className="hover:border-foreground/20 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold">
                        Kamar {room.roomNumber}
                      </CardTitle>
                      <Badge
                        variant={isOccupied ? "default" : isVacant ? "outline" : "secondary"}
                        className="text-[11px]"
                      >
                        {isOccupied ? "Terisi" : isVacant ? "Kosong" : "Pemeliharaan"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Tipe: {room.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="text-sm font-semibold text-foreground">
                      {formatRupiah(room.monthlyRate)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">/ bulan</span>
                    </div>

                    {room.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {room.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t flex justify-end">
                      <Link
                        href={`/dashboard/rooms/${room.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8"}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>Detail Kamar</span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Edit Properti */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Informasi Properti</DialogTitle>
            <DialogDescription>
              Perbarui rincian alamat dan peraturan properti.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditProperty} className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="edit-name" className="text-xs font-semibold">Nama Kos</label>
              <Input
                id="edit-name"
                required
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-address" className="text-xs font-semibold">Alamat</label>
              <Input
                id="edit-address"
                required
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-city" className="text-xs font-semibold">Kota</label>
              <Input
                id="edit-city"
                required
                value={editData.city}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-desc" className="text-xs font-semibold">Deskripsi</label>
              <Input
                id="edit-desc"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-rules" className="text-xs font-semibold">Peraturan</label>
              <Input
                id="edit-rules"
                value={editData.rules}
                onChange={(e) => setEditData({ ...editData, rules: e.target.value })}
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

      {/* Modal Tambah Kamar */}
      <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Unit Kamar</DialogTitle>
            <DialogDescription>
              Tambahkan kamar baru pada kos {property.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRoom} className="space-y-3 py-2">
            {roomError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {roomError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="room-no" className="text-xs font-semibold">
                Nomor / Nama Kamar <span className="text-destructive">*</span>
              </label>
              <Input
                id="room-no"
                required
                value={roomData.roomNumber}
                onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })}
                placeholder="Contoh: 101, A1, Melati-2"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="room-type" className="text-xs font-semibold">
                Tipe Kamar
              </label>
              <Input
                id="room-type"
                value={roomData.type}
                onChange={(e) => setRoomData({ ...roomData, type: e.target.value })}
                placeholder="Standard, VIP, Kamar Mandi Dalam"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="room-rate" className="text-xs font-semibold">
                Tarif Sewa Bulanan (Rp) <span className="text-destructive">*</span>
              </label>
              <Input
                id="room-rate"
                type="number"
                min="10000"
                step="10000"
                required
                value={roomData.monthlyRate}
                onChange={(e) => setRoomData({ ...roomData, monthlyRate: e.target.value })}
                placeholder="Contoh: 1500000"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="room-notes" className="text-xs font-semibold">
                Catatan Kamar (Opsional)
              </label>
              <Input
                id="room-notes"
                value={roomData.notes}
                onChange={(e) => setRoomData({ ...roomData, notes: e.target.value })}
                placeholder="Lantai 1 dekat jendela depan"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddRoomOpen(false)}
                disabled={roomLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={roomLoading}>
                {roomLoading ? "Menyimpan..." : "Tambah Kamar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PropertyDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-32 bg-card rounded-xl border animate-pulse"></div>
          <div className="h-64 bg-card rounded-xl border animate-pulse"></div>
        </div>
      }
    >
      <PropertyDetailContent params={props.params} />
    </React.Suspense>
  );
}

