"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { BillData } from "../types";

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillData | null;
}

export default function PaymentDetailsModal({
  isOpen,
  onClose,
  bill,
}: PaymentDetailsModalProps) {
  if (!isOpen || !bill) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>Payment Details</DialogTitle>
          <DialogDescription className={undefined}>
            A detailed breakdown of payments for bill{" "}
            <span className="font-mono">{bill.billingPeriod}</span> for{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {bill.dormer?.firstName} {bill.dormer?.lastName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto">
          <Table className={undefined}>
            <TableHeader className={undefined}>
              <TableRow className={undefined}>
                <TableHead className={undefined}>Amount Paid</TableHead>
                <TableHead className={undefined}>Payment Date</TableHead>
                <TableHead className={undefined}>Method</TableHead>
                <TableHead className={undefined}>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={undefined}>
              {bill.payments && bill.payments.length > 0 ? (
                bill.payments.map((payment) => (
                  <TableRow key={payment.id} className={undefined}>
                    <TableCell className="font-medium w-[120px]">
                      ₱{payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="w-[150px]">
                      <span className="truncate block">
                        {new Date(payment.paymentDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="w-[140px]">
                      <span className="truncate block" title={payment.paymentMethod}>
                        {payment.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <span className="truncate block" title={
                        payment.recordedByName ||
                        (payment.recordedByUser
                          ? `${payment.recordedByUser.firstName} ${payment.recordedByUser.lastName}`
                          : "N/A")
                      }>
                        {payment.recordedByName ||
                          (payment.recordedByUser
                            ? `${payment.recordedByUser.firstName} ${payment.recordedByUser.lastName}`
                            : "N/A")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className={undefined}>
                  <TableCell
                    colSpan={4}
                    className="text-center h-24 text-gray-500"
                  >
                    No payments have been recorded for this bill yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
