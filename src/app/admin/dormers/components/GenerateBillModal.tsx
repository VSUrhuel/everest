"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dormer, Payable, Bill } from "../types";
import { generateBillingPeriods } from "../utils/generateBillUtils";
import { findExistingBill, isPaidBill } from "@/lib/admin/bill";

// --- Type Definitions ---
interface GenerateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormer: Dormer | null;
  onGenerateBill: (billData: any) => void;
  payables: Payable[];
  bills: Bill[]; // Pass all bills to check for duplicates
  setShowConfirmDialog: (show: boolean) => void;
  setShowErrorModal: (show: boolean) => void;
  setBillToCreate: (bill: any) => void;
}

// --- Component ---
export default function GenerateBillModal({
  isOpen,
  onClose,
  dormer,
  onGenerateBill,
  payables,
  bills,
  setShowConfirmDialog,
  setShowErrorModal,
  setBillToCreate,
}: GenerateBillModalProps) {
  const [selectedPayableId, setSelectedPayableId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState("");

  const billingPeriods = useMemo(() => generateBillingPeriods(), []);

  useEffect(() => {
    const selectedPayable = payables.find(p => p.id === selectedPayableId);
    setTotalAmount(selectedPayable ? selectedPayable.amount : 0);
  }, [selectedPayableId, payables]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPayableId("");
      setTotalAmount(0);
      if (billingPeriods.length > 0) {
        setBillingPeriod(billingPeriods[0].value);
      }
    }
  }, [isOpen, dormer, billingPeriods]);

  const handlePayableChange = (payableId: string) => {
    setSelectedPayableId(payableId);
  };

  if (!dormer) return null;

  const handleGenerateBill = async () => {
    if (!billingPeriod) {
      toast.info("Please select a billing period.");
      return;
    }
    if (!selectedPayableId || totalAmount <= 0) {
      toast.info("Please select a payable to generate a bill.");
      return;
    }
    if (dormer.id === undefined || dormer.id === null) {
      toast.error("Dormer ID is undefined.");
      return;
    }

    const selectedPayable = payables.find(p => p.id === selectedPayableId);
    if (!selectedPayable) {
      toast.error("Selected payable not found.");
      return;
    }

    const billData = {
      dormerId: dormer.id,
      billingPeriod,
      status: "Unpaid" as Bill["status"],
      totalAmountDue: selectedPayable.amount,
      description: selectedPayable.name,
      payableId: selectedPayable.id,
      amountPaid: 0,
    };

    // Check database directly for most up-to-date data
    const isPaid = await isPaidBill(billData.dormerId, billData.billingPeriod, billData.payableId);
    if (isPaid) {
      setShowErrorModal(true);
      return;
    }

    const existingBillId = await findExistingBill(
      billData.dormerId,
      billData.billingPeriod,
      billData.payableId
    );

    if (existingBillId) {
      setBillToCreate({ ...billData, id: existingBillId });
      setShowConfirmDialog(true);
    } else {
      onGenerateBill(billData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className={undefined}>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-green-100 text-green-800">
                {dormer.firstName?.[0]}
                {dormer.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className={undefined}>Generate New Bill</DialogTitle>
              <DialogDescription className={undefined}>
                {dormer.firstName} {dormer.lastName} • Room {dormer.roomNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="billingPeriod" className={undefined}>
              Billing Period
            </Label>
            <Select value={billingPeriod} onValueChange={setBillingPeriod}>
              <SelectTrigger id="billingPeriod" className="mt-1">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {billingPeriods.map((period) => (
                  <SelectItem
                    key={period.value}
                    value={period.value}
                    className={undefined}
                  >
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className={undefined} />

          <div className="space-y-3">
            <Label htmlFor="payable" className="text-base font-semibold">
              Select Payable
            </Label>
            <Select value={selectedPayableId} onValueChange={handlePayableChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a payable" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {payables.map((payable) => (
                  <SelectItem
                    key={payable.id}
                    value={payable.id}
                    className={undefined}
                  >
                    {payable.name} - ₱{payable.amount.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount" className={undefined}>
              Total Bill Amount
            </Label>
            <Input
              id="amount"
              type="text"
              value={`₱ ${totalAmount.toFixed(2)}`}
              readOnly
              className="mt-1 bg-gray-100 font-semibold text-gray-800"
            />
          </div>
        </div>

        <DialogFooter className={undefined}>
          <Button
            variant="outline"
            onClick={onClose}
            className={undefined}
            size={undefined}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleGenerateBill}
            variant={undefined}
            size={undefined}
          >
            Generate Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
