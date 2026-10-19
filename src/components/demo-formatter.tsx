"use client";

import * as React from "react";
import { formatRupiah, createWhatsAppReminderUrl, normalizeIndonesianPhone } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { MessageSquare, Calculator, ExternalLink } from "lucide-react";

export function DemoFormatter() {
  const [nominal, setNominal] = React.useState<number>(1500000);
  const [phone, setPhone] = React.useState<string>("081234567890");
  const [tenantName, setTenantName] = React.useState<string>("Budi Santoso");
  const [roomNumber, setRoomNumber] = React.useState<string>("Kamar 102");

  const messageText = `Halo Kak ${tenantName}, ini pengingat tagihan sewa ${roomNumber} sebesar ${formatRupiah(
    nominal
  )} untuk bulan ini. Mohon konfirmasi jika pembayaran telah dilakukan. Terima kasih.`;

  const waUrl = createWhatsAppReminderUrl(phone, messageText);
  const normalizedPhone = normalizeIndonesianPhone(phone);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Calculator className="h-5 w-5" />
            <CardTitle className="text-lg">Format Mata Uang Rupiah</CardTitle>
          </div>
          <CardDescription>
            Validasi nilai numerik dan format standar akuntansi Indonesia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="nominal-input" className="text-sm font-medium">
              Masukkan Angka (Nominal Sewa):
            </label>
            <Input
              id="nominal-input"
              type="number"
              value={nominal}
              onChange={(e) => setNominal(Number(e.target.value) || 0)}
              step={50000}
              min={0}
            />
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Hasil Format Rupiah
            </p>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatRupiah(nominal)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <MessageSquare className="h-5 w-5" />
            <CardTitle className="text-lg">Generator Tautan WhatsApp</CardTitle>
          </div>
          <CardDescription>
            Sanitasi otomatis no HP lokal (08... ke 628...) dan enkripsi pesan tagihan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="tenant-input" className="text-xs font-medium">
                Nama Penghuni
              </label>
              <Input
                id="tenant-input"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="room-input" className="text-xs font-medium">
                No. Kamar
              </label>
              <Input
                id="room-input"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="phone-input" className="text-xs font-medium">
              Nomor WhatsApp Penghuni
            </label>
            <Input
              id="phone-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
            />
            <p className="text-[11px] text-muted-foreground">
              Ternormalisasi ke: <span className="font-mono font-medium text-foreground">+{normalizedPhone}</span>
            </p>
          </div>
          <div className="pt-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", className: "w-full gap-2 text-xs" })}
            >
              <span>Buka Preview Tautan WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
