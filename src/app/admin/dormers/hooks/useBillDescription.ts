import { useMemo } from "react";
import { Bill, Payable } from "../types";

/**
 * Hook to get dynamic bill description based on payableId
 * Falls back to static description if payableId is not available
 */
export function useBillDescription(bill: Bill, payables: Payable[]): string {
  return useMemo(() => {
    // If bill has payableId, use it to get current payable name
    if (bill.payableId && payables.length > 0) {
      const payable = payables.find((p) => p.id === bill.payableId);
      
      // If we found matching payable, return its current name
      if (payable) {
        return payable.name;
      }
    }

    // Fallback to static description
    return bill.description || "N/A";
  }, [bill.payableId, bill.description, payables]);
}

/**
 * Utility to get bill description for a single bill
 */
export function getBillDescription(bill: Bill, payables: Payable[]): string {
  if (bill.payableId && payables.length > 0) {
    const payable = payables.find((p) => p.id === bill.payableId);
    
    if (payable) {
      return payable.name;
    }
  }

  return bill.description || "N/A";
}
