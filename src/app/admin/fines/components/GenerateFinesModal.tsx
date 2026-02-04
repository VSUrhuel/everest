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
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import { Dormer } from "../../dormers/types";
import { BillFines, Fine, PaymentFines } from "../types";
// --- Type Definitions ---
interface GenerateFinesModalProps {
  isOpen: boolean;
  isSubmmitting: boolean;
  onClose: () => void;
  dormer: Dormer | null;
  onGenerateFine: (fineData: BillFines) => void;
  payables: Fine[];
  paymentFines: PaymentFines[];
  setShowErrorModal: (show: boolean) => void;
  setFineToCreate: (fine: any) => void;
}

// --- Component ---
export default function GenerateFinesModal({
  isOpen,
  isSubmmitting,
  onClose,
  dormer,
  onGenerateFine,
  payables,
  paymentFines,
  setShowErrorModal,
  setFineToCreate,
}: GenerateFinesModalProps) {
  const [selectedPayables, setSelectedPayables] = useState<
    Record<string, boolean>
  >({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [finesRemarks, setFinesRemarks] = useState("");
  const [dateImposed, setDateImposed] = useState("");

  useEffect(() => {
    const newTotal = payables.reduce((sum, payable) => {
      return selectedPayables[payable.id] ? sum + payable.amount : sum;
    }, 0);
    const selectedNames = payables
      .filter((payable) => selectedPayables[payable.id])
      .map((payable) => payable.name);
    setFinesRemarks(selectedNames.join(", "));
    setTotalAmount(newTotal);
  }, [selectedPayables, payables]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPayables({});
      setTotalAmount(0);
      setDescription("");
      const today = new Date().toISOString().split("T")[0];
      setDateImposed(today);
    }
  }, [isOpen, dormer]);

  const handlePayableChange = (payableId: string) => {
    setSelectedPayables((prev) => ({
      ...prev,
      [payableId]: !prev[payableId],
    }));
  };

  if (!dormer) return null;

  const handleGenerateFine = () => {
    if (totalAmount <= 0) {
      toast.info("Please select at least one payable to generate a fine.");
      return;
    }
    if (dormer.id === undefined || dormer.id === null) {
      toast.error("Dormer ID is undefined.");
      return;
    }

    const paymentFineData = {
      dormerId: dormer.id,
      dormitoryId: dormer.dormitoryId,
      finesRemarks: finesRemarks,
      description: description,
      dateImposed: Timestamp.fromDate(new Date(dateImposed)),
      totalAmountDue: totalAmount,
    };

    onGenerateFine(paymentFineData);
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
              <DialogTitle className={undefined}>Generate New Fine</DialogTitle>
              <DialogDescription className={undefined}>
                {dormer.firstName} {dormer.lastName} • Room {dormer.roomNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Separator className={undefined} />

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="payables" className="text-base font-semibold">
                Payables
              </Label>
              <div className="text-right">
                <p className="text-xs text-gray-500">Running Total</p>
                <p className="text-2xl font-bold text-gray-800">
                  ₱{totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal" size={undefined}                >
                  <span className="truncate">
                    {Object.keys(selectedPayables).filter(id => selectedPayables[id]).length === 0
                      ? "Select payables..."
                      : `${Object.keys(selectedPayables).filter(id => selectedPayables[id]).length} selected`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full p-0" align="start">
                <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                  {payables.map((payable) => (
                    <div
                      key={payable.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => handlePayableChange(payable.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={payable.id}
                          checked={!!selectedPayables[payable.id]}
                          onChange={() => {}} 
                          className="pointer-events-none"
                        />
                        <Label
                          htmlFor={payable.id}
                          className="font-normal text-sm cursor-pointer flex-1"
                        >
                          {payable.name}
                        </Label>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        ₱{payable.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <Label htmlFor="amount" className={undefined}>
              Total Fine Amount
            </Label>
            <Input
              id="amount"
              type="text"
              value={`₱ ${totalAmount.toFixed(2)}`}
              readOnly
              className="mt-1 bg-gray-100 font-semibold text-gray-800"
            />
          </div>
          <div>
            <Label htmlFor="dateImposed" className={undefined}>
              Date Imposed
            </Label>
            <Input
              id="dateImposed"
              type="date"
              value={dateImposed}
              onChange={(e) => setDateImposed(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description" className={undefined}>
              Description / Notes{" "}
              <span className="text-xs text-gray-500">
                ({description.length}/500)
              </span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Fine for late payment, property damage, or violation of dormitory rules."
              className="mt-1"
              maxLength={500}
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
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleGenerateFine}
            variant={undefined}
            size={undefined}
            disabled={isSubmmitting}
          >
            {isSubmmitting ? "Generating..." : "Generate Fine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
