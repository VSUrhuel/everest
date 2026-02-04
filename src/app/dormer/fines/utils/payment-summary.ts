import { PaymentFines } from "@/app/admin/fines/types";

export function calculateFinePaymentSummary(fines: PaymentFines[]) {
    const totalAmountDue = fines.reduce((total, fine) => total + fine.totalAmountDue, 0);
    const totalAmountPaid = fines.reduce((total, fine) => total + fine.amountPaid, 0);
    const totalBalance = totalAmountDue - totalAmountPaid;
    return { totalAmountDue, totalAmountPaid, totalBalance };
}