"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Fine } from "../fines/types";

/**
 * --- Type Definitions ---
 * Defines the shape of the props for the AddPayableModal component.
 */
interface AddFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payableData: Partial<Fine>) => void;
  fine: Fine | null;
}

/**
 * A modal for adding or editing a payable.
 */
export default function AddFineModal({
  isOpen,
  onClose,
  onSave,
  fine,
}: AddFineModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const isEditing = Boolean(fine);

  useEffect(() => {
    if (isOpen && isEditing && fine) {
      setName(fine.name || "");
      setAmount(String(fine.amount) || "");
      setDescription(fine.description || "");
    } else if (isOpen) {
      setName("");
      setAmount("");
      setDescription("");
    }
  }, [isOpen, fine, isEditing]);

  const handleSave = () => {
    if (!name || !amount) {
      toast.info("Title and Amount are required.");
      return;
    }

    const fineData: Partial<Fine> = {
      ...(isEditing && { id: fine?.id }),
      name: name,
      amount: parseFloat(amount),
      description,
    };

    onSave(fineData);
    onClose();
  };

  const handleClose = () => {
    setName("");
    setAmount("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>
            {isEditing ? "Edit Fine" : "Add New Fine"}
          </DialogTitle>
          <DialogDescription className={undefined}>
            {isEditing
              ? "Update the details of this fine."
              : "Fill in the details to add a new fine."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name{" "}
              <span className="text-xs text-gray-500">({name.length}/100)</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Monthly Rent"
              maxLength={100}
              type={undefined}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 500.00"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right md:cols-span-1">
              <div className="flex flex-col md:flex-row md:items-center">
                <span>Description</span>
                <span className="text-xs text-gray-500 md:ml-2 mt-1 md:mt-0">
                  ({description.length}/300)
                </span>
              </div>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="(Optional) Any details about this payable."
              maxLength={300}
            />
          </div>
        </div>
        <DialogFooter className={undefined}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className={undefined}
            size={undefined}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className={undefined}
            variant={undefined}
            size={undefined}
          >
            {isEditing ? "Update Fine" : "Add Fine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
