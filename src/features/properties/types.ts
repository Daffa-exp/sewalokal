export type RoomStatusType = "VACANT" | "OCCUPIED" | "MAINTENANCE";

export interface PropertySummary {
  id: string;
  name: string;
  address: string;
  city: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
}

export interface RoomDetail {
  id: string;
  propertyId: string;
  roomNumber: string;
  type: string;
  monthlyRate: number;
  status: RoomStatusType;
  facilities: string[];
}
