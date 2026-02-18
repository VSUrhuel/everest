import { Key } from "react";

export interface Dormer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roomNumber: string;
  createdAt: any;
  dormitoryId: string;
  isDeleted?: boolean;
  bills: Bill[];
  dormitoryName?: string;
}

export interface Bill {
  dormer: any;
  billDate: any;
  remainingBalance: number;
  id: string;
  dormerId: string;
  billingPeriod: string;
  status: "Paid" | "Unpaid" | "Partially Paid" | "Overdue";
  totalAmountDue: number;
  amountPaid: number;
  description: string; 
  payableId: string; 
  updatedAt: any;
  isDeleted?: boolean;
}

export interface Payable { //regular chanrge
  id: string;
  name: string;
  amount: number;
  description: string;
}

export type ModalType =
  | "add"
  | "bills"
  | "payment"
  | "generateBill"
  | "deleteDormer"
  | "edit"
  | "delete"
  | "import"
  | "importBills"
  | null;

export interface DormerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roomNumber: string;
  dormerId?: string;
}

export interface AdviserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  dormitoryId?: string;
  dormitoryName?: string;
}

export interface ImportedBill {
  email: string;
  firstName: string;
  lastName: string;
  billingPeriod: string;
  rowNumber: number;
  isParsingError?: boolean;
  error?: string;
}

export interface MappedBill extends ImportedBill {
  dormerId: string;
  dormitoryId: string;
  originalIndex: number;
}
