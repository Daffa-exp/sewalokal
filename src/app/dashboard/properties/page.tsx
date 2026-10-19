"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, MapPin, DoorOpen, Archive, Eye, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  description?: string | null;
  rules?: string | null;
  isArchived: boolean;
  createdAt: string;
  rooms?: Array<{ id: string; status: string; monthlyRate: number }>;
}

export default function PropertiesPage() {
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Add modal state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    address: "",
    city: "",
    description: "",
    rules: "",
  });

  // Archive modal state
  const [propertyToArchive, setPropertyToArchive] = React.useState<Property | null>(null);
  const [archiveLoading, setArchiveLoading] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) {
          throw new Error("Gagal mengambil data properti");
        }
        const data = await res.json();
        if (!ignore && data.success) {
          setProperties(data.data);
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
  }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menambahkan properti");
      }

      setIsAddOpen(false);
      setFormData({ name: "", address: "", city: "", description: "", rules: "" });
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!propertyToArchive) return;
    setArchiveLoading(true);

    try {
      const res = await fetch(`/api/properties/${propertyToArchive.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal mengarsipkan properti");
      }
      setPropertyToArchive(null);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengarsipkan properti");
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Daftar Properti Kos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola lokasi bangunan kos, unit kamar, dan peraturan tempat hunian.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="gap-2 shrink-0 self-start sm:self-auto min-h-[40px]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Properti</span>
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

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl border bg-card/60 animate-pulse p-6 space-y-4"
            >
              <div className="h-5 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base">Belum ada properti kos</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Mulai dengan mendaftarkan properti pertama Anda untuk mengelola kamar dan penghuni kos.
            </p>
            <Button
              onClick={() => setIsAddOpen(true)}
              variant="outline"
              className="mt-4 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Properti Sekarang</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Property Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => {
            const totalRooms = property.rooms?.length || 0;
            const occupiedRooms =
              property.rooms?.filter((r) => r.status === "OCCUPIED").length || 0;

            return (
              <Card key={property.id} className="flex flex-col justify-between hover:border-foreground/20 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold truncate">
                      {property.name}
                    </CardTitle>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                      {property.city}
                    </span>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs mt-1 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <span>Total Unit Kamar</span>
                    </div>
                    <span className="font-semibold">
                      {occupiedRooms} / {totalRooms} Terisi
                    </span>
                  </div>

                  {property.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {property.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPropertyToArchive(property)}
                      className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" />
                      <span>Arsipkan</span>
                    </Button>

                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8"}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>Detail & Kamar</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Properti */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Properti Baru</DialogTitle>
            <DialogDescription>
              Isi data dasar bangunan kos Anda. Anda dapat menambahkan kamar setelahnya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-foreground">
                Nama Kos <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Kost Melati Residence"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="address" className="text-xs font-semibold text-foreground">
                Alamat Lengkap <span className="text-destructive">*</span>
              </label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Sukabumi No. 12"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="city" className="text-xs font-semibold text-foreground">
                Kota / Kabupaten <span className="text-destructive">*</span>
              </label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Bandung"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-xs font-semibold text-foreground">
                Deskripsi Singkat (Opsional)
              </label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kos khusus mahasiswa / karyawan"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rules" className="text-xs font-semibold text-foreground">
                Peraturan Kos (Opsional)
              </label>
              <Input
                id="rules"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Gerbang ditutup pukul 23:00"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={formLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Menyimpan..." : "Simpan Properti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Arsip Properti */}
      <Dialog
        open={Boolean(propertyToArchive)}
        onOpenChange={(open) => !open && setPropertyToArchive(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Arsipkan Properti</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengarsipkan kos{" "}
              <strong className="text-foreground">{propertyToArchive?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              Mengarsipkan properti akan menyembunyikannya dari daftar operasional aktif, namun
              seluruh riwayat keuangan, tagihan, dan pembayaran lampau tetap tersimpan aman.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPropertyToArchive(null)}
              disabled={archiveLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleArchive}
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
