# SewaLokal

Platform SaaS pengelolaan kos yang dirancang khusus untuk pemilik kos kecil hingga menengah di Indonesia: kelola kamar, pencatatan data penghuni, penerbitan tagihan bulanan, pencatatan pembayaran manual, dan pengiriman pengingat sewa melalui tautan WhatsApp langsung (`wa.me`).

---

## 1. Prasyarat Sistem

Sebelum memulai, pastikan lingkungan pengembangan Anda telah memenuhi spesifikasi berikut:
- **Node.js**: Versi `20.x` atau `22.x` (LTS direkomendasikan).
- **Package Manager**: `pnpm` (versi 9 ke atas atau v11).
- **Database**: PostgreSQL (versi 14 ke atas, lokal atau cloud seperti Neon, Supabase, Railway).
- **Git**: Versi 2.x ke atas.

---

## 2. Struktur Direktori Proyek

Proyek disusun dengan arsitektur modular yang rapi:

```text
sewalokal/
├── prisma/
│   └── schema.prisma        # Definisi skema relasional PostgreSQL
├── public/                  # Static assets & favicon
├── src/
│   ├── app/                 # Next.js App Router (Halaman & Route Handlers API)
│   │   ├── api/auth/        # Endpoint API autentikasi (login, register, logout)
│   │   ├── dashboard/       # Layout shell dan halaman dashboard operasional
│   │   ├── login/           # Formulir masuk akun pemilik kos
│   │   ├── register/        # Formulir registrasi pemilik kos
│   │   ├── globals.css      # Design tokens, CSS variables, dan styling dasar
│   │   ├── layout.tsx       # Root layout dengan ThemeProvider
│   │   └── page.tsx         # Landing page & demo interaktif formatters
│   ├── components/
│   │   ├── layout/          # Komponen layout navigasi (Navbar, Sidebar)
│   │   ├── ui/              # Primitives shadcn/ui (Button, Card, Input, dsb.)
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── features/            # Tipe domain & modul fitur bisnis
│   │   ├── properties/      # Tipe & entitas properti dan kamar
│   │   ├── tenants/         # Tipe & entitas penyewa dan kontrak sewa
│   │   └── billing/         # Tipe & entitas tagihan dan pembayaran
│   ├── lib/                 # Utilitas inti, database singleton, dan helper format
│   │   ├── auth.ts          # Business logic autentikasi
│   │   ├── db.ts            # PrismaClient singleton
│   │   ├── formatters.ts    # Format Rupiah, tanggal lokal, normalisasi WhatsApp
│   │   ├── password.ts      # Hashing bcryptjs
│   │   ├── session.ts       # Enkripsi JWT sesi via jose & cookie HttpOnly
│   │   └── validations/     # Skema validasi Zod modular
│   ├── middleware.ts        # Proteksi rute server-side (/dashboard)
│   └── server/              # Server-side data access layer (DAL) & services
│       ├── dal/             # Queries & mutations berproteksi IDOR per ownerId
│       ├── auth.ts          # Server auth boundary
│       └── db.ts            # Re-export Prisma database singleton
├── tests/
│   ├── unit/                # Unit tests (auth, invoice calculations)
│   └── integration/         # Integration tests (data isolation & IDOR tests)
├── e2e/                     # End-to-end tests (Playwright)
├── .env.example             # Template variabel lingkungan
├── components.json          # Konfigurasi registry shadcn/ui
├── package.json             # Dependensi dan script pengembangan
├── tsconfig.json            # Konfigurasi TypeScript strict mode
└── vitest.config.mts        # Konfigurasi unit test runner Vitest
```

---

## 3. Instalasi & Setup

### Langkah 1: Kloning & Pemasangan Dependensi
```bash
# Pastikan berada di direktori proyek
pnpm install
```

### Langkah 2: Konfigurasi Environment Variables
Salin template `.env.example` ke `.env`:
```bash
# Pada Windows PowerShell
Copy-Item .env.example .env

# Atau pada Command Prompt / Linux
cp .env.example .env
```

Sesuaikan nilai variabel di dalam `.env`:
```env
# Koneksi PostgreSQL (ganti kredensial sesuai database Anda)
DATABASE_URL="postgresql://postgres:password@localhost:5432/sewalokal?schema=public"

# Kunci rahasia JWT sesi (gunakan string acak minimal 32 karakter di produksi)
AUTH_SECRET="kunci-rahasia-autentikasi-sewalokal-minimal-32-karakter"

# URL dasar aplikasi
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 4. Migrasi & Sinkronisasi Database

Setelah koneksi PostgreSQL Anda aktif di `DATABASE_URL`:

```bash
# Generate Prisma Client lokal
pnpm db:generate

# Sinkronisasi skema Prisma ke database PostgreSQL
pnpm db:push

# Membuka Prisma Studio (GUI database lokal di browser)
pnpm db:studio
```

---

## 5. Perintah Pengembangan & Pengujian

| Perintah | Deskripsi |
|---|---|
| `pnpm dev` | Menjalankan local development server (`http://localhost:3000`) |
| `pnpm build` | Membangun artefak produksi Next.js yang teroptimasi |
| `pnpm start` | Menjalankan server produksi yang sudah di-build |
| `pnpm lint` | Memeriksa kepatuhan kode menggunakan ESLint |
| `pnpm typecheck` | Menjalankan verifikasi tipe TypeScript (`tsc --noEmit`) |
| `pnpm test:unit` | Menjalankan unit tests dengan Vitest |
| `pnpm test:e2e` | Menjalankan pengujian end-to-end dengan Playwright |

---

## 6. Status Pengembangan Fitur

- [x] **Fase 0: Project Foundation**
  - Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui.
  - Skema PostgreSQL Prisma & formatters Rupiah, tanggal lokal, wa.me.
- [x] **Fase 1: Authentication & Data Foundation**
  - Autentikasi session cookie HttpOnly dengan enkripsi JWT (jose) & hash bcryptjs.
  - Server-side Data Access Layer (DAL) dengan proteksi anti-IDOR.
- [x] **Fase 2: Property, Room & Tenant Management**
  - **Properti**: Tambah, lihat detail, perbarui, dan arsipkan properti kos.
  - **Kamar**: Manajemen unit kamar, filter status (Kosong, Terisi, Pemeliharaan), pencarian unit, dan soft-archival.
  - **Penghuni**: Pencatatan data penyewa minimum non-sensitif (nama, nomor WA/telepon, email, kontak darurat, catatan).
  - **Penempatan (Check-in)**: Penentuan sewa aktif dengan deteksi konflik kamar aktif (HTTP 409 Conflict) dan pembaruan status kamar atomik.
  - **Selesai Sewa (Check-out)**: Transaksional mengakhiri masa sewa penyewa dan membebaskan kamar kembali menjadi Kosong, dengan integritas riwayat keuangan tetap terjaga.
- [x] **Fase 3: Invoicing & Payment Records**
  - **Penerbitan Tagihan**: Pembuatan tagihan individual dan massal secara idempoten lintas masa sewa aktif tanpa risiko duplikasi (`@@unique([occupancyId, periodMonth, periodYear])`).
  - **Snapshot Tarif Sewa**: Nilai tagihan disnapshot langsung dari kesepakatan sewa aktif, sehingga perubahan tarif di kemudian hari tidak merusak histori keuangan masa lalu.
  - **Kaidah Status Tagihan**: Status deterministik berbasis tanggal dan sisa tagihan (`UNPAID`, `PARTIAL`, `PAID`, `OVERDUE`).
  - **Pencatatan Pembayaran Atomik**: Transaksi database dengan validasi nominal ketat (`> 0` dan `<= remainingBalance`).
  - **Pembatalan / Reversal Non-Destruktif**: Pembatalan pembayaran mempertahankan jejak audit (`isCancelled`, `cancelledAt`, `cancelReason`) dan mengembalikan sisa tagihan secara atomik.
  - **Prinsip Akuntansi Pemasukan Riil**: "Tagihan bukan pemasukan." Pendapatan operasional hanya menghitung transaksi pembayaran riil yang valid dan tidak dibatalkan.
- [x] **Fase 4: Dashboard, Reports & WhatsApp Reminders**
  - **Dashboard Operasional Aktif**: Filter periode dinamis (bulan & tahun), KPI properti aktif, tingkat okupansi kamar, kas riil diterima, sisa piutang, dan tunggakan lewat jatuh tempo.
  - **Umpan Aktivitas Pembayaran**: Menampilkan transaksi kas masuk terbaru lengkap dengan nominal, metode bayar, dan kamar penyewa.
  - **Tagihan Perlu Tindak Lanjut**: Menampilkan tagihan jatuh tempo atau belum lunas dengan tombol pengingat WhatsApp langsung.
  - **Laporan Rekap Bulanan**: Halaman `/dashboard/reports` dengan filter kos dan periode, ringkasan KPI, tingkat pelunasan (*Collection Rate %*), serta tabel rincian per unit.
  - **Ekspor CSV Aman**: Endpoint `GET /api/reports/export` menghasilkan berkas CSV terfilter dengan perlindungan sanitasi formula injection (`=`, `+`, `-`, `@`) dan isolasi data per akun pemilik (anti-IDOR).
  - **Pengingat WhatsApp Terstandar**: Validasi nomor telepon Indonesia (`isValidIndonesianPhone`), pembentukan pesan sopan (`buildBillingReminderMessage`), pembukaan chat `wa.me`, dan pencatatan audit timestamp `reminderSentAt`.
- [x] **Fase 5: QA, Hardening & Production Readiness**
  - **Audit Fungsional (11 Langkah Golden Path)**: Registrasi, login, properti, kamar, penyewa, check-in sewa, invoice snapshot, bayar sebagian, pelunasan, dashboard/laporan, WhatsApp reminder, dan checkout sewa.
  - **Pengerasan Keamanan**: HTTP Security Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
  - **Sanitasi Error**: Pesan galat publik tidak membocorkan perintah internal atau string koneksi database.
  - **Health Check Aman**: Endpoint `GET /api/health` untuk uptime monitor tanpa membocorkan rahasia infrastruktur.
  - **Audit Anti-IDOR Menyeluruh**: Penolakan 403 Forbidden di seluruh mutasi dan kueri data lintas akun pemilik kos.

---

## 7. Standar Kualitas & Keamanan (Antislop & Security)

- **Isolasi Data Akun**: Seluruh mutasi dan query data diproteksi di sisi server menggunakan identitas sesi pemilik terverifikasi. Tidak ada manipulasi kepemilikan melalui client-side parameter.
- **Pencegahan Konflik Sewa**: Kamar yang telah memiliki sewa aktif dilarang ditempati ulang secara bersamaan.
- **Transparansi Statistik**: Dashboard tidak memuat data fiktif atau angka dummy buatan. Data statistik dihitung langsung dari database.
- **Pencatatan Pembayaran**: Model bisnis MVP menggunakan pencatatan manual (Transfer Bank, Tunai, QRIS) tanpa payment gateway otomatis.
- **Aksesibilitas (WCAG AA)**: Desain antarmuka mendukung Light Mode dan Dark Mode dengan rasio kontras warna yang nyaman dibaca dan ramah navigasi touch/keyboard.

---

## 8. Panduan Deployment Produksi (Vercel & Managed PostgreSQL)

### 8.1. Kamus Variabel Lingkungan Produksi

Pastikan variabel lingkungan berikut telah dikonfigurasi di dashboard Vercel (**Settings** -> **Environment Variables**):

| Nama Variabel | Contoh Nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.neon.tech/sewalokal?sslmode=require` | URL PostgreSQL terkelola (Neon, Supabase, Railway, AWS RDS). Wajib mengaktifkan `sslmode=require`. |
| `AUTH_SECRET` | `a8f5c3...` *(64 karakter heksadesimal)* | Kunci rahasia enkripsi JWT sesi. Hasilkan via `openssl rand -hex 32`. Wajib minimal 32 karakter di produksi. |
| `NEXTAUTH_URL` | `https://sewalokal.com` | Domain publik kanonikal aplikasi Anda dengan protokol HTTPS. |
| `NODE_ENV` | `production` | Mengaktifkan optimasi rilis produksi Next.js, cookie HttpOnly `Secure`, dan HSTS. |

### 8.2. Prosedur Migrasi Database yang Aman

> [!WARNING]
> **Larangan Reset Database di Produksi**:
> Jangan pernah menjalankan `prisma db push --force-reset` atau `prisma migrate reset` pada lingkungan produksi karena akan menghapus seluruh data nyata.

Gunakan prosedur migrasi bertahap (*forward migrations*):

```bash
# 1. Jalankan migrasi produksi di server / CI/CD pipeline
pnpm dlx prisma migrate deploy

# 2. Periksa status migrasi aktif
pnpm dlx prisma migrate status
```

### 8.3. Strategi Backup PostgreSQL & Prosedur Pemulihan (Disaster Recovery)

Untuk PostgreSQL terkelola (Neon, Supabase, Railway), aktifkan fitur **Automated Daily Backups** dan **Point-in-Time Recovery (PITR)** pada dashboard penyedia cloud.

Untuk backup berkala mandiri menggunakan script terjadwal (*cron job*):

```bash
#!/bin/bash
# Skrip cadangan harian PostgreSQL
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/sewalokal"
mkdir -p $BACKUP_DIR

# Ekspor cadangan terkompresi
pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_DIR/sewalokal_backup_$TIMESTAMP.dump"

# Hapus cadangan yang lebih lama dari 30 hari
find $BACKUP_DIR -type f -name "*.dump" -mtime +30 -delete
```

**Prosedur Pemulihan (*Restore Runbook*)**:
```bash
# Memulihkan data dari berkas cadangan ke database tujuan
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" sewalokal_backup_20261019.dump
```

### 8.4. Monitoring & Health Check

Sistem menyediakan endpoint pemantauan kesehatan aplikasi:

- **URL**: `GET /api/health`
- **Respons Normal (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-19T12:00:00.000Z",
    "service": "sewalokal-api",
    "database": "connected"
  }
  ```
- **Respons Gangguan Database (HTTP 503)**:
  ```json
  {
    "status": "error",
    "timestamp": "2026-10-19T12:00:00.000Z",
    "service": "sewalokal-api",
    "database": "disconnected"
  }
  ```
- Endpoint ini aman dihubungkan ke layanan monitoring eksternal seperti Vercel Health, BetterUptime, atau UptimeRobot.

### 8.5. Kepatuhan Audit Logging & Perlindungan Data Pribadi (PII)

- Seluruh endpoint API tidak mencatat teks password, token sesi JWT mentah, atau nomor identitas ke dalam output log server.
- Log server hanya mencatat pesan error yang telah disanitasi untuk tujuan investigasi performa dan debugging operasional.

### 8.6. Konfigurasi Domain Kustom & HTTPS

1. Tambahkan domain kustom (misal `app.sewalokal.com`) pada Vercel Dashboard -> **Settings** -> **Domains**.
2. Atur CNAME DNS record mengarah ke `cname.vercel-dns.com`.
3. Vercel secara otomatis menerbitkan dan memperpanjang sertifikat SSL/TLS gratis via Let's Encrypt.
4. HTTP Security Headers yang terpasang di `next.config.ts` otomatis memaksakan enkripsi HSTS dan proteksi Clickjacking.

