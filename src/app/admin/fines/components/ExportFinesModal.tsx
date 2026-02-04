"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Fine, PaymentFinesData } from "../types";
import { FileDown, Info } from "lucide-react";
import { Dormer } from "../../dormers/types";

interface ExportFinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  payableFines: Fine[];
  fines: PaymentFinesData[];
  dormers: Dormer[];
}

export default function ExportFinesModal({
  isOpen,
  onClose,
  payableFines,
  fines,
  dormers,
}: ExportFinesModalProps) {
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);

  const handleExport = () => {
    if (!selectedFine) {
      toast.error("Please select a fine type to export.");
      return;
    }

    // Filter fines by selected fine type
    const filteredFines = fines.filter(fine => fine.fineId === selectedFine.id);

    if (filteredFines.length === 0) {
      toast.error(`No fines found for "${selectedFine.name}".`);
      return;
    }

    // Group fines by dormer to create attendance-style CSV
    const dormerFinesMap = new Map<string, PaymentFinesData[]>();
    
    filteredFines.forEach(fine => {
      const key = fine.dormerId;
      if (!dormerFinesMap.has(key)) {
        dormerFinesMap.set(key, []);
      }
      dormerFinesMap.get(key)!.push(fine);
    });

    // Get all unique dates across all fines, sorted
    const allDates = [...new Set(filteredFines.map(fine => {
      const date = fine.dateImposed instanceof Date 
        ? fine.dateImposed 
        : (fine.dateImposed as any)?.toDate?.() || new Date();
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }))].sort();

    // Build CSV
    let csvContent = "Email,First Name,Last Name";
    allDates.forEach(date => {
      csvContent += `,${date}`;
    });
    csvContent += "\n";

    // Add rows for each dormer with fines
    dormerFinesMap.forEach((dormerFines, dormerId) => {
      const dormer = dormers.find(d => d.id === dormerId);
      if (!dormer) return;

      const email = dormer.email || "";
      const firstName = dormer.firstName || "";
      const lastName = dormer.lastName || "";

      csvContent += `${email},${firstName},${lastName}`;

      // For each date column, check if dormer has a fine on that date
      allDates.forEach(date => {
        const hasFineOnDate = dormerFines.some(fine => {
          const fineDate = fine.dateImposed instanceof Date 
            ? fine.dateImposed 
            : (fine.dateImposed as any)?.toDate?.() || new Date();
          return fineDate.toISOString().split('T')[0] === date;
        });
        // Empty cell means absence (fine), present value means attended
        csvContent += hasFineOnDate ? "," : ",Present";
      });

      csvContent += "\n";
    });

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fines_${selectedFine.name.replace(/\s+/g, '_')}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredFines.length} fine records for "${selectedFine.name}"`);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFine(null);
    onClose();
  };

  // Get fine counts
  const fineTypeCounts = payableFines.map(fine => ({
    ...fine,
    count: fines.filter(f => f.fineId === fine.id).length,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className={undefined}>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-blue-600" />
            Export Fines to CSV
          </DialogTitle>
          <DialogDescription className={undefined}>
            Select a fine type to export all associated fine records in CSV format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fine Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select Fine Type <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedFine?.id || ""}
              onValueChange={(value) => {
                const fine = payableFines.find(f => f.id === value);
                setSelectedFine(fine || null);
              }}
            >
              <SelectTrigger className={undefined}>
                <SelectValue placeholder="Choose a fine type to export..." />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {fineTypeCounts.map((fine) => (
                  <SelectItem key={fine.id} value={fine.id!} className={undefined}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{fine.name}</span>
                      <span className="text-xs text-gray-500">
                        ({fine.count} record{fine.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-medium">Export Format:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>CSV file with Email, First Name, Last Name, and date columns</li>
                  <li>Empty cells indicate dates with fines (absences)</li>
                  <li>"Present" values indicate no fine on that date</li>
                  <li>All fines for selected type included regardless of payment status</li>
                </ul>
              </div>
            </div>
          </div>

          {selectedFine && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Selected Fine:</p>
              <p className="text-lg font-bold text-[#2E7D32]">{selectedFine.name}</p>
              <p className="text-sm text-gray-600">₱{selectedFine.amount.toFixed(2)} per fine</p>
              <p className="text-xs text-gray-500 mt-1">
                {fineTypeCounts.find(f => f.id === selectedFine.id)?.count || 0} total records to export
              </p>
            </div>
          )}
        </div>

        <DialogFooter className={undefined}>
          <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full sm:w-auto" size={undefined}          >
            Cancel
          </Button>
          <Button
                      onClick={handleExport}
                      disabled={!selectedFine}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" variant={undefined} size={undefined}          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
