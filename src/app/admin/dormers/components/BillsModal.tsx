"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dormer, Bill, Payable } from "../types";
import { getStatusBadgeInfo } from "../utils/badgeUtils";
import { getBillDescription } from "../hooks/useBillDescription";
import { getBillingPeriodLabel } from "../utils/generateBillUtils";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface BillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormer: Dormer | null;
  onRecordPayment: (bill: Bill) => void;
  onPayAll: () => Promise<void>;
  payables: Payable[];
}

export default function BillsModal({
  isOpen,
  onClose,
  dormer,
  onRecordPayment,
  onPayAll,
  payables,
}: BillsModalProps) {
  const { ConfirmDialog } = useConfirmDialog();
  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
  const [isPayingAll, setIsPayingAll] = useState(false);
  const [billsData, setBillsData] = useState<Bill[]>([]);

  useEffect(() => {
    if (dormer?.bills) {
      setBillsData([...dormer.bills]);
    }
  }, [dormer?.bills]);

  if (!dormer) return null;

  const unpaidBills = billsData.filter(
    (b) => b.status === "Unpaid" || b.status === "Partially Paid" || b.status === "Overdue"
  );

  const totalUnpaidAmount = unpaidBills.reduce(
    (sum, b) => sum + (b.totalAmountDue - (b.amountPaid || 0)),
    0
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader className={undefined}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-green-100 text-green-800">
                    {dormer.firstName?.[0]}
                    {dormer.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className={undefined}>
                    {dormer.firstName} {dormer.lastName}
                  </DialogTitle>
                  <DialogDescription className={undefined}>
                    Room {dormer.roomNumber}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {totalUnpaidAmount > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Unpaid</div>
                    <div className="text-lg font-semibold text-red-600">
                      ₱{totalUnpaidAmount.toFixed(2)}
                    </div>
                  </div>
                )}
                {unpaidBills.length > 0 && (
                  <Button
                    onClick={() => setShowPayAllConfirm(true)}
                    disabled={isPayingAll}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    variant={undefined}
                    size={undefined}
                  >
                    <CreditCard className="h-4 w-4 mr-2" /> Pay All
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 overflow-x-auto">
            <Tabs defaultValue="bills" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bills" className={undefined}>
                  Bills
                </TabsTrigger>
                <TabsTrigger value="details" className={undefined}>
                  Details
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="bills"
                className="py-4 max-h-[60vh] overflow-y-auto"
              >
                <Table className={undefined}>
                  <TableHeader className={undefined}>
                    <TableRow className={undefined}>
                      <TableHead className={undefined}>Period</TableHead>
                      <TableHead className={undefined}>Remarks</TableHead>
                      <TableHead className={undefined}>Amount Due</TableHead>
                      <TableHead className={undefined}>Amount Paid</TableHead>
                      <TableHead className={undefined}>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={undefined}>
                    {billsData.map((bill) => {
                      const { className, Icon } = getStatusBadgeInfo(bill.status);
                      const billDescription = getBillDescription(bill, payables);
                      return (
                        <TableRow key={bill.id} className={undefined}>
                          <TableCell className="w-[150px]">
                            <span className="truncate block" title={getBillingPeriodLabel(bill.billingPeriod)}>
                              {getBillingPeriodLabel(bill.billingPeriod)}
                            </span>
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <span className="truncate block text-gray-600" title={billDescription}>
                              {billDescription}
                            </span>
                          </TableCell>
                          <TableCell className="w-[120px]">
                            ₱{bill.totalAmountDue.toFixed(2)}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            ₱{(bill.amountPaid || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="w-[140px]">
                            <Badge className={className} variant={undefined}>
                              {Icon && <Icon className="h-4 w-4 mr-1 flex-shrink-0" />}
                              <span className="truncate">{bill.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right w-[140px]">
                            <div className="flex gap-2 justify-end">
                              {(bill.status === "Unpaid" ||
                                bill.status === "Partially Paid" ||
                                bill.status === "Overdue") && (
                                <Button
                                  size="sm"
                                  onClick={() => onRecordPayment(bill)}
                                  className="h-8 bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                                  variant={undefined}
                                  disabled={isPayingAll}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" /> Pay
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {billsData.length === 0 && (
                      <TableRow className={undefined}>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="text-gray-500 text-lg font-medium">No bills found</div>
                            <div className="text-gray-400 text-sm">
                              This dormer doesn't have any bills recorded yet.
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="details" className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={undefined}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Email</Label>
                        <p>{dormer.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Phone</Label>
                        <p>{dormer.phone}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={undefined}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Dormitory Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">
                          Room Number
                        </Label>
                        <p>{dormer.roomNumber}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          Date Added
                        </Label>
                        <p>
                          {dormer.createdAt
                            ? new Date(
                                dormer.createdAt.toDate()
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <ConfirmDialog />
        </DialogContent>
      </Dialog>

      {/* Pay All Confirmation Dialog */}
      <Dialog open={showPayAllConfirm} onOpenChange={setShowPayAllConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className={undefined}>
            <DialogTitle className={undefined}>Confirm Pay All</DialogTitle>
            <DialogDescription className={undefined}>
              Are you sure you want to mark all unpaid bills for{" "}
              {dormer.firstName} {dormer.lastName} as paid? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={undefined}>
            <Button
              variant="outline"
              onClick={() => setShowPayAllConfirm(false)}
              className={undefined}
              size={undefined}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsPayingAll(true);
                try {
                  await onPayAll();
                  setBillsData((prev) =>
                    prev.map((b) =>
                      b.status === "Unpaid" ||
                      b.status === "Partially Paid" ||
                      b.status === "Overdue"
                        ? {
                            ...b,
                            status: "Paid",
                            amountPaid: b.totalAmountDue,
                          }
                        : b
                    )
                  );
                  setShowPayAllConfirm(false);
                  onClose();
                } catch (error) {
                  setShowPayAllConfirm(false);
                } finally {
                  setIsPayingAll(false);
                }
              }}
              disabled={isPayingAll}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              variant={undefined}
              size={undefined}
            >
              {isPayingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                "Confirm Pay All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
