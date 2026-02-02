"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FinesErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FinesErrorModal({ isOpen, onClose }: FinesErrorModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      className="bg-red-100 text-red-800"
    >
      <DialogContent className={undefined}>
        <DialogTitle className={undefined}>Error</DialogTitle>
        <DialogDescription className={undefined}>
          An existing payment for this fine already exists. You cannot
          override or delete it.
        </DialogDescription>
        <DialogFooter className={undefined}>
          <Button
            onClick={onClose}
            className={undefined}
            variant={undefined}
            size={undefined}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}