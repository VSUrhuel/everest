import { Bill, Dormer } from "../dormers/types";

export interface Payment {
  id: string;
  billId: string;
  dormerId: string;
  dorermDetails: {
    firstName: string;
    lastName: string;
    roomNumber: string;
    email: string;
  };
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  recordedBy: string;
  recordedByName?: string;
  createdAt: any;
}

export interface BillData extends Bill {
  remainingBalance: number;
  dormer: Dormer;
  payments: (Payment & { recordedByUser?: Dormer })[];
  updatedAt: any;
}
