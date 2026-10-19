/**
 * Formats a numeric value into Indonesian Rupiah currency format.
 * Example: 1500000 -> "Rp 1.500.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) {
    return "Rp 0";
  }

  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Normalizes non-breaking spaces or standard currency spacing
  return formatted.replace(/\s+/g, " ");
}

/**
 * Formats a Date or date string into standard Indonesian localized date.
 * Example: "2026-10-19" -> "19 Oktober 2026"
 */
export function formatDateIndonesia(
  dateInput: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return "-";
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat("id-ID", defaultOptions).format(date);
}

/**
 * Normalizes Indonesian phone number strings to international format for WhatsApp.
 * Handles prefixes: "08...", "+628...", "628...", and removes spaces, dashes, parentheses.
 * Example: "0812-3456-7890" -> "6281234567890"
 */
export function normalizeIndonesianPhone(phone: string): string {
  // Strip non-digit characters except leading plus
  let cleaned = phone.replace(/[^0-9+]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (!cleaned.startsWith("62") && cleaned.length > 0) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

/**
 * Generates a wa.me direct chat URL with prefilled message.
 * Safe for WhatsApp reminder functionality.
 */
export function createWhatsAppReminderUrl(phone: string, message: string): string {
  const normalizedPhone = normalizeIndonesianPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

/**
 * Calculates how many days an invoice is overdue relative to today.
 * Returns 0 if dueDate is today or in the future.
 */
export function calculateDaysOverdue(dueDateInput: Date | string): number {
  const dueDate = typeof dueDateInput === "object" ? dueDateInput : new Date(dueDateInput);
  if (isNaN(dueDate.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Validates if a phone number string is a valid Indonesian mobile number.
 * Must start with 08, 628, or +628, and contain 10 to 15 digits total.
 */
export function isValidIndonesianPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (!cleaned) return false;
  const normalized = normalizeIndonesianPhone(cleaned);
  // Valid Indonesian mobile numbers normalized to 628 have 10-14 digits following 628 (total 11-15 digits)
  return /^628[0-9]{8,12}$/.test(normalized);
}

export interface BillingReminderParams {
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  periodMonth: number;
  periodYear: number;
  remainingBalance: number;
  dueDate: Date | string;
}

const MONTH_NAMES_INDONESIA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Builds a polite, professional Indonesian billing reminder text message for WhatsApp.
 */
export function buildBillingReminderMessage(params: BillingReminderParams): string {
  const monthName = MONTH_NAMES_INDONESIA[params.periodMonth - 1] || `Bulan ${params.periodMonth}`;
  const formattedBalance = formatRupiah(params.remainingBalance);
  const formattedDueDate = formatDateIndonesia(params.dueDate);

  return [
    `Halo Kak ${params.tenantName},`,
    "",
    `Ini pengingat pembayaran sewa kos untuk ${params.propertyName} kamar ${params.roomNumber} periode ${monthName} ${params.periodYear}.`,
    "",
    `Sisa tagihan: ${formattedBalance}`,
    `Batas jatuh tempo: ${formattedDueDate}`,
    "",
    "Mohon konfirmasi apabila pembayaran telah dilakukan. Terima kasih!",
  ].join("\n");
}

