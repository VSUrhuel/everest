"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fine } from "../types"; 
import { FileUp, Info, ExternalLink } from "lucide-react";

interface ImportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fines: any[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  isSubmitting: boolean;
  payableFines: Fine[]; 
}

export default function ImportAttendanceModal({
  isOpen,
  onClose,
  onImport,
  isSubmitting,
  payableFines,
}: ImportAttendanceModalProps) {
  const [csvText, setCsvText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvText(e.target.value);
  };

  const parseAttendanceCSV = (text: string, selectedFine: Fine | null) => {
    const errors: string[] = [];

    if (!selectedFine) {
      errors.push("Please select a fine type before importing.");
      return { fines: [], errors };
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      errors.push("Invalid CSV format: File must contain at least a header row and one data row.");
      return { fines: [], errors };
    }

    const fines: any[] = [];

    const headers = lines[0].split(",").map((h) => h.trim());
    if (headers.length < 4) {
      errors.push("Invalid CSV format: Must have at least 4 columns (Email, First Name, Last Name, and date columns).");
      return { fines, errors };
    }

    if (headers[0].toLowerCase() !== "email" || headers[1].toLowerCase() !== "first name" || headers[2].toLowerCase() !== "last name") {
      errors.push(`Invalid CSV headers: First three columns must be "Email", "First Name", "Last Name". Found: "${headers[0]}", "${headers[1]}", "${headers[2]}".`);
      return { fines, errors };
    }

    // validate date headers (columns 4+)
    for (let j = 3; j < headers.length; j++) {
      const dateStr = headers[j].trim();
      if (!dateStr) {
        errors.push(`Column ${j + 1}: Date header is empty.`);
        continue;
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push(`Column ${j + 1}: Invalid date format "${dateStr}". Use format like "2024-01-15".`);
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1;
      const parts = lines[i].split(",").map((p) => p.trim());

      if (parts.length < 4) {
        errors.push(`Row ${rowNumber}: Insufficient columns. Expected at least 4 columns, found ${parts.length}.`);
        continue;
      }

      const email = parts[0];
      const firstName = parts[1];
      const lastName = parts[2];

      if (!email || !firstName || !lastName) {
        errors.push(`Row ${rowNumber}: Missing required fields. Email, First Name, and Last Name are required.`);
        continue;
      }

      // basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${rowNumber}: Invalid email format "${email}".`);
        continue;
      }

      let hasAbsences = false;
      for (let j = 3; j < parts.length && j < headers.length; j++) {
        const value = parts[j]?.trim();
        if (value === "1") {
          hasAbsences = true;
          const dateStr = headers[j];
          const date = new Date(dateStr);

          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNumber}: Invalid date "${dateStr}" in attendance data.`);
            continue;
          }

          fines.push({
            email: email,
            firstName: firstName,
            lastName: lastName,
            amount: selectedFine.amount,
            reason: selectedFine.name,
            fineId: selectedFine.id,
            dateImposed: date,
            rowNumber: rowNumber,
          });
        }
      }

      if (!hasAbsences) {
        errors.push(`Row ${rowNumber}: No absences marked for ${firstName} ${lastName} (${email}). At least one attendance column must be "1".`);
      }
    }

    if (fines.length === 0 && errors.length === 0) {
      errors.push("No valid attendance data found. Ensure at least one student has absences marked with '1'.");
    }

    return { fines, errors };
  };

  const handleImport = async () => {
    const { fines, errors: parsingErrors } = parseAttendanceCSV(csvText, selectedFine);

    if (parsingErrors.length > 0) {
      // Pass parsing errors to the parent component for display in results modal
      const errorFines = parsingErrors.map(error => ({ error, isParsingError: true }));
      await onImport(errorFines);
      handleClose();
      return;
    }

    if (fines.length === 0) {
      toast.error("No absences found to generate fines.");
      return;
    }

    await onImport(fines);
    handleClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setCsvText("");
    setSelectedFine(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>
            Import Spreadsheet for Fines
          </DialogTitle>
          <DialogDescription className={undefined}>
            Upload or paste CSV data for fines. Fines will be generated for
            empty cells using dormer emails as unique identifiers, with names as additional reference.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-blue-50 p-4 rounded-md flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Required CSV Format:</p>
              <code className="bg-blue-100 px-1 py-0.5 rounded">
                Email, First Name, Last Name, 1/1/2026, 1/2/2026, ...
              </code>
              <p className="mt-2 text-xs italic">
                * Use 1 for present, leave empty for absent. Each row is a dormer's record with email as unique identifier.
              </p>
              <p className="mt-2 text-xs font-medium">
                Please make sure you are following this format. 
                <a 
                  href="https://docs.google.com/spreadsheets/d/1T0x4CuSUsBycX0nUJk3UUKYjGEnCTg2YLWRJG5bTVOU/edit?gid=0#gid=0" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline ml-1 inline-flex items-center gap-1"
                >
                  View sample format here
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Select Fine Type</label>
            <Select 
              onValueChange={(value) => setSelectedFine(payableFines.find(f => f.id === value) || null)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={undefined}>
                <SelectValue placeholder="Choose a fine type" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {payableFines.map((fine) => (
                  <SelectItem key={fine.id} value={fine.id} className={undefined}>
                    {fine.name} - ₱{fine.amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Paste CSV Data</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs border-dashed"
                disabled={isSubmitting}
              >
                <FileUp className="h-3 w-3 mr-2" />
                Upload File
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                disabled={isSubmitting}
              />
            </div>
            <Textarea
              placeholder="dormer1@email.com, John, Doe, 1, , 1&#10;dormer2@email.com, Jane, Smith, , 1, "
              className="min-h-[200px] font-mono text-xs"
              value={csvText}
              onChange={handleTextChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className={undefined}>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className={undefined}
            size={undefined}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleImport}
            disabled={!csvText.trim() || isSubmitting || !selectedFine}
            variant={undefined}
            size={undefined}
          >
            {isSubmitting ? "Generating Fines..." : "Generate Fines"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
