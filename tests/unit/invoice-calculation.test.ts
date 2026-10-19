import { describe, it, expect } from "vitest";
import { calculateInvoiceFinancials } from "@/server/dal/invoices";

describe("Invoice Financials & Deterministic Calculation", () => {
  const invoiceAmount = 1500000;
  const futureDueDate = new Date();
  futureDueDate.setDate(futureDueDate.getDate() + 10);

  const pastDueDate = new Date();
  pastDueDate.setDate(pastDueDate.getDate() - 5);

  it("calculates UNPAID status when no payments recorded and not past due date", () => {
    const financials = calculateInvoiceFinancials(invoiceAmount, [], futureDueDate);

    expect(financials.totalPaid).toBe(0);
    expect(financials.remainingBalance).toBe(1500000);
    expect(financials.status).toBe("UNPAID");
  });

  it("calculates OVERDUE status when no payments recorded and past due date", () => {
    const financials = calculateInvoiceFinancials(invoiceAmount, [], pastDueDate);

    expect(financials.totalPaid).toBe(0);
    expect(financials.remainingBalance).toBe(1500000);
    expect(financials.status).toBe("OVERDUE");
  });

  it("calculates PARTIAL status when paid amount is less than invoice total", () => {
    const payments = [
      { amount: 500000 },
      { amount: 300000 },
    ];
    const financials = calculateInvoiceFinancials(invoiceAmount, payments, futureDueDate);

    expect(financials.totalPaid).toBe(800000);
    expect(financials.remainingBalance).toBe(700000);
    expect(financials.status).toBe("PARTIAL");
  });

  it("calculates PAID status when exact invoice amount is settled", () => {
    const payments = [
      { amount: 1000000 },
      { amount: 500000 },
    ];
    const financials = calculateInvoiceFinancials(invoiceAmount, payments, futureDueDate);

    expect(financials.totalPaid).toBe(1500000);
    expect(financials.remainingBalance).toBe(0);
    expect(financials.status).toBe("PAID");
  });

  it("calculates PAID status when payment exceeds invoice amount (overpayment safely clamped)", () => {
    const payments = [{ amount: 1600000 }];
    const financials = calculateInvoiceFinancials(invoiceAmount, payments, futureDueDate);

    expect(financials.totalPaid).toBe(1600000);
    expect(financials.remainingBalance).toBe(0);
    expect(financials.status).toBe("PAID");
  });

  it("strictly ignores cancelled payments when calculating total paid and balance", () => {
    const payments = [
      { amount: 500000, isCancelled: false },
      { amount: 500000, isCancelled: true }, // cancelled payment
      { amount: 200000, isCancelled: false },
    ];
    const financials = calculateInvoiceFinancials(invoiceAmount, payments, futureDueDate);

    expect(financials.totalPaid).toBe(700000);
    expect(financials.remainingBalance).toBe(800000);
    expect(financials.status).toBe("PARTIAL");
  });
});
