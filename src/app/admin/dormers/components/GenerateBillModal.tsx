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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dormer, Payable, Bill } from "../types";
import { generateBillingPeriods } from "../utils/generateBillUtils";
import { findExistingBill, isPaidBill } from "@/lib/admin/bill";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";

// --- Type Definitions ---
interface GenerateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormer: Dormer | null;
  onGenerateBill: (billData: any) => void;
  onGenerateBillsBulk?: (billDataArray: any[]) => void; // optional bulk handler
  payables: Payable[];
  bills: Bill[];
  setShowConfirmDialog: (show: boolean) => void;
  setShowErrorModal: (show: boolean) => void;
  setBillToCreate: (bill: any) => void;
}

type Mode = "single" | "bulk";

// --- Component ---
export default function GenerateBillModal({
  isOpen,
  onClose,
  dormer,
  onGenerateBill,
  onGenerateBillsBulk,
  payables,
  bills,
  setShowConfirmDialog,
  setShowErrorModal,
  setBillToCreate,
}: GenerateBillModalProps) {
  const [mode, setMode] = useState<Mode>("single");

  // Single mode state
  const [selectedPayableId, setSelectedPayableId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState(0);

  // Bulk mode state
  const [selectedPayableIds, setSelectedPayableIds] = useState<Set<string>>(new Set());

  // Shared state
  const [billingPeriod, setBillingPeriod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {dormitoryName} = useCurrentDormitoryId();

  const billingPeriods = useMemo(() => generateBillingPeriods(dormitoryName), [dormitoryName]);

  // Sync single mode total
  useEffect(() => {
    const selectedPayable = payables.find((p) => p.id === selectedPayableId);
    setTotalAmount(selectedPayable ? selectedPayable.amount : 0);
  }, [selectedPayableId, payables]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setMode("single");
      setSelectedPayableId("");
      setTotalAmount(0);
      setSelectedPayableIds(new Set());
      setIsSubmitting(false);
      if (billingPeriods.length > 0) {
        setBillingPeriod(billingPeriods[0].value);
      }
    }
  }, [isOpen, dormer, billingPeriods]);

  if (!dormer) return null;

  // --- Bulk checkbox helpers ---
  const togglePayable = (id: string) => {
    setSelectedPayableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPayableIds.size === payables.length) {
      setSelectedPayableIds(new Set());
    } else {
      setSelectedPayableIds(new Set(payables.map((p) => p.id)));
    }
  };

  const bulkTotal = payables
    .filter((p) => selectedPayableIds.has(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  // --- Submit handlers ---
  const handleGenerateSingle = async () => {
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

    const selectedPayable = payables.find((p) => p.id === selectedPayableId);
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

  const handleGenerateBulk = async () => {
    if (!billingPeriod) {
      toast.info("Please select a billing period.");
      return;
    }
    if (selectedPayableIds.size === 0) {
      toast.info("Please select at least one payable.");
      return;
    }
    if (dormer.id === undefined || dormer.id === null) {
      toast.error("Dormer ID is undefined.");
      return;
    }

    setIsSubmitting(true);

    const selectedPayables = payables.filter((p) => selectedPayableIds.has(p.id));
    const billsToCreate: any[] = [];
    const skippedPaid: string[] = [];
    const skippedExisting: string[] = [];

    for (const payable of selectedPayables) {
      const isPaid = await isPaidBill(dormer.id, billingPeriod, payable.id);
      if (isPaid) {
        skippedPaid.push(payable.name);
        continue;
      }

      const existingBillId = await findExistingBill(dormer.id, billingPeriod, payable.id);
      if (existingBillId) {
        skippedExisting.push(payable.name);
        continue;
      }

      billsToCreate.push({
        dormerId: dormer.id,
        billingPeriod,
        status: "Unpaid" as Bill["status"],
        totalAmountDue: payable.amount,
        description: payable.name,
        payableId: payable.id,
        amountPaid: 0,
      });
    }

    setIsSubmitting(false);

    if (skippedPaid.length > 0) {
      toast.warning(`Already paid: ${skippedPaid.join(", ")}`);
    }
    if (skippedExisting.length > 0) {
      toast.warning(`Unpaid bill already exists for: ${skippedExisting.join(", ")}`);
    }

    if (billsToCreate.length === 0) {
      toast.info("No new bills to generate.");
      onClose();
      return;
    }

    if (onGenerateBillsBulk) {
      onGenerateBillsBulk(billsToCreate);
    } else {
      // Fallback: generate one by one
      billsToCreate.forEach((bill) => onGenerateBill(bill));
    }

    toast.success(`${billsToCreate.length} bill(s) queued for generation.`);
    onClose();
  };

  const allSelected = payables.length > 0 && selectedPayableIds.size === payables.length;
  const someSelected = selectedPayableIds.size > 0 && !allSelected;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
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
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 gap-1 bg-gray-50">
            <button
              onClick={() => setMode("single")}
              className={`flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-all ${
                mode === "single"
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Single Bill
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-all ${
                mode === "bulk"
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Bulk Bills
            </button>
          </div>

          {/* Billing Period (shared) */}
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
                  <SelectItem key={period.value} value={period.value} className={undefined}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className={undefined} />

          {/* ── SINGLE MODE ── */}
          {mode === "single" && (
            <>
              <div className="space-y-3">
                <Label htmlFor="payable" className="text-base font-semibold">
                  Select Payable
                </Label>
                <Select value={selectedPayableId} onValueChange={setSelectedPayableId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a payable" />
                  </SelectTrigger>
                  <SelectContent className={undefined}>
                    {payables.map((payable) => (
                      <SelectItem key={payable.id} value={payable.id} className={undefined}>
                        {payable.name} — ₱{payable.amount.toFixed(2)}
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
            </>
          )}

          {/* ── BULK MODE ── */}
          {mode === "bulk" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Select Payables</Label>
                {selectedPayableIds.size > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedPayableIds.size} selected
                  </Badge>
                )}
              </div>

              {/* Select All row */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  // indeterminate state via data attribute for styling if needed
                  onCheckedChange={toggleSelectAll}
                  className={undefined}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer select-none flex-1"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </label>
                <span className="text-xs text-gray-400">{payables.length} payables</span>
              </div>

              {/* Payable checkboxes */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {payables.map((payable) => (
                  <div
                    key={payable.id}
                    onClick={() => togglePayable(payable.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                      selectedPayableIds.has(payable.id)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Checkbox
                      id={`payable-${payable.id}`}
                      checked={selectedPayableIds.has(payable.id)}
                      onCheckedChange={() => togglePayable(payable.id)}
                      className={undefined}
                    />
                    <label
                      htmlFor={`payable-${payable.id}`}
                      className="flex-1 text-sm font-medium cursor-pointer select-none"
                    >
                      {payable.name}
                    </label>
                    <span className="text-sm text-gray-600 font-medium">
                      ₱{payable.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bulk total */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-md bg-gray-100 border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Total Amount Due</span>
                <span className="text-sm font-bold text-gray-900">₱{bulkTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={undefined}>
          <Button variant="outline" onClick={onClose} className={undefined} size={undefined}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={mode === "single" ? handleGenerateSingle : handleGenerateBulk}
            disabled={isSubmitting}
            variant={undefined}
            size={undefined}
          >
            {isSubmitting
              ? "Checking..."
              : mode === "bulk"
              ? `Generate ${selectedPayableIds.size > 0 ? selectedPayableIds.size : ""} Bill${selectedPayableIds.size !== 1 ? "s" : ""}`
              : "Generate Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}