export type OccupancyStatusType = "ACTIVE" | "TERMINATED" | "EXPIRED";
export type LeaseStatusType = OccupancyStatusType;

export interface TenantSummary {
  id: string;
  name: string;
  phone: string;
  roomNumber?: string;
  propertyName?: string;
  occupancyStatus?: OccupancyStatusType;
}

export interface OccupancyDetail {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate?: string | null;
  billingDueDay: number;
  depositAmount: number;
  monthlyRent: number;
  status: OccupancyStatusType;
}

export type LeaseDetail = OccupancyDetail;
