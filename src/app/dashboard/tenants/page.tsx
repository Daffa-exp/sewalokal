"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  DoorOpen,
  Eye,
  AlertCircle,
  Building2,
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

interface ActiveOccupancy {
  id: string;
  room: {
    id: string;
    roomNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
}

interface TenantItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  emergencyContact: string | null;
  notes: string | null;
  occupancies?: ActiveOccupancy[];
}

export default function TenantsPage() {
  const [tenants, setTenants] = React.useState<TenantItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Add modal
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    phone: "",
    email: "",
    emergencyContact: "",
    notes: "",
  });

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const queryParams = new URLSearchParams();
        if (search.trim()) queryParams.set("search", search.trim());

        const res = await fetch(`/api/tenants?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil data penghuni");

        const result = await res.json();
        if (!ignore && result.success) {
          setTenants(result.data);
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
  }, [search, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          emergencyContact: formData.emergencyContact || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menambahkan penghuni");
      }

      setIsAddOpen(false);
      setFormData({ name: "", phone: "", email: "", emergencyContact: "", notes: "" });
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Data Penghuni Kos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola kontak penyewa, unit kamar aktif, dan catatan penting.
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
          <span>Tambah Penghuni</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, nomor WhatsApp, atau email..."
          className="pl-9 text-sm"
        />
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

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl border bg-card/60 animate-pulse p-5 space-y-3"
            >
              <div className="h-5 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base">Tidak ada data penghuni</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {search
                ? "Tidak ada penghuni yang sesuai dengan kata kunci pencarian Anda."
                : "Daftarkan penyewa kos untuk mulai menghubungkannya dengan unit kamar."}
            </p>
            {!search && (
              <Button
                onClick={() => setIsAddOpen(true)}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Penghuni Sekarang</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((tenant) => {
            const activeOccupancy = tenant.occupancies?.[0];

            return (
              <Card key={tenant.id} className="flex flex-col justify-between hover:border-foreground/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold truncate">
                      {tenant.name}
                    </CardTitle>
                    <Badge
                      variant={activeOccupancy ? "default" : "outline"}
                      className="text-[11px] shrink-0"
                    >
                      {activeOccupancy ? "Aktif Menyewa" : "Tidak Aktif"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1 text-xs">
                    {tenant.phone && (
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{tenant.phone}</span>
                      </p>
                    )}
                    {tenant.email && (
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{tenant.email}</span>
                      </p>
                    )}
                  </div>

                  <div className="rounded-md bg-muted/40 p-2.5 text-xs">
                    {activeOccupancy ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <DoorOpen className="h-3.5 w-3.5 text-primary" />
                          <span>Kamar {activeOccupancy.room.roomNumber}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{activeOccupancy.room.property.name}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Belum ditempatkan di kamar</p>
                    )}
                  </div>

                  <div className="pt-2 border-t flex justify-end">
                    <Link
                      href={`/dashboard/tenants/${tenant.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" }) + " text-xs h-8"}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>Rincian Penghuni</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Penghuni */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Penghuni Baru</DialogTitle>
            <DialogDescription>
              Isi data kontak dasar penghuni kos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 py-2">
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="tenant-name" className="text-xs font-semibold">
                Nama Lengkap <span className="text-destructive">*</span>
              </label>
              <Input
                id="tenant-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="tenant-phone" className="text-xs font-semibold">
                Nomor Telepon / WhatsApp
              </label>
              <Input
                id="tenant-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081234567890"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="tenant-email" className="text-xs font-semibold">
                Email
              </label>
              <Input
                id="tenant-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="budi@example.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="tenant-emergency" className="text-xs font-semibold">
                Kontak Darurat (Opsional)
              </label>
              <Input
                id="tenant-emergency"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="Ibu / 081298765432"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="tenant-notes" className="text-xs font-semibold">
                Catatan (Opsional)
              </label>
              <Input
                id="tenant-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Karyawan di Sudirman"
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
                {formLoading ? "Menyimpan..." : "Simpan Penghuni"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
