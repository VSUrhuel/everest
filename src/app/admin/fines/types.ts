import { Timestamp } from "firebase/firestore";
import { Dormer, Bill } from "../dormers/types";

/** standard date type for firestore and js compatibility */
type FirestoreDate = Timestamp | Date;

/** basic fine definition */
export interface Fine {
    id?: string;
    name: string;
    amount: number;
    description: string;
    isDeleted?: boolean;
}

/** summary of fine statistics */
export interface FineSummary {
    totalFines: number;
    collectedFines: number;
    collectibleFines: number;
}

/** fine billing information */
export interface BillFines {
    billedFineId?: string;
    totalAmountDue: number;
    dormerId: string;
    dormitoryId: string;
    finesRemarks: string;
    fineId?: string;
    dateImposed?: FirestoreDate;
}

/** fine payment record */
export interface PaymentFines {
    id?: string;
    billedFineId: string;
    totalAmountDue: number;
    amountPaid: number;
    remainingBalance: number;
    paymentDate: FirestoreDate | null;
    dormerId: string;
    dormitoryId: string;
    finesRemarks: string;
    fineId?: string;
    createdAt: Timestamp;
    status: "Paid" | "Unpaid" | "Partially Paid";
    dateImposed?: FirestoreDate;
    recordedBy?: string;
    isDeleted?: boolean;
}

/** payment fine with recorded by as dormer object */
export interface PaymentFinesData extends Omit<PaymentFines, "recordedBy"> {
    recordedBy: Dormer;
}

/** imported fine from csv */
export interface ImportedFine {
    email: string;
    firstName: string;
    lastName: string;
    amount: number;
    reason: string;
    fineId: string;
    dateImposed: Date;
    rowNumber: number;
    isParsingError?: boolean;
    error?: string;
}

/** mapped fine after validation */
export interface MappedFine extends ImportedFine {
    dormerId: string;
    dormitoryId: string;
    originalIndex: number;
}

/** dormer with associated fines data */
export interface DormerWithFines extends Omit<Dormer, "bills"> {
    bills: Bill[];
    fines: PaymentFinesData[];
}