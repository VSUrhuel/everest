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
import { FileUp, Info, ExternalLink, AlertCircle } from "lucide-react";

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
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [fineCount, setFineCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    const lines = text.trim().split("\n").filter(line => line.trim());
    // Subtract header row if exists
    const dataRows = lines.length > 0 && lines[0].toLowerCase().includes('email') ? lines.length - 1 : lines.length;
    setRowCount(dataRows);
    
    // Rough estimate: count empty cells (absences) for fine count preview
    let estimatedFines = 0;
    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('email')) return; // Skip header
      const cells = line.split(',');
      if (cells.length > 3) {
        // Count empty date cells (starting from index 3)
        estimatedFines += cells.slice(3).filter(cell => !cell.trim() || cell.trim() === '').length;
      }
    });
    setFineCount(estimatedFines);
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

      // Process attendance dates - skip rows with perfect attendance (no absences)
      for (let j = 3; j < parts.length && j < headers.length; j++) {
        const value = parts[j]?.trim();
        // Empty cell indicates absence (fineable date)
        if (value === "" || value === undefined) {
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
      // Note: Rows with perfect attendance (no empty cells) are silently skipped - they don't generate fines
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
      const lines = text.trim().split("\n").filter(line => line.trim());
      const dataRows = lines.length > 0 && lines[0].toLowerCase().includes('email') ? lines.length - 1 : lines.length;
      setRowCount(dataRows);
      
      // Estimate fine count
      let estimatedFines = 0;
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes('email')) return;
        const cells = line.split(',');
        if (cells.length > 3) {
          estimatedFines += cells.slice(3).filter(cell => !cell.trim() || cell.trim() === '').length;
        }
      });
      setFineCount(estimatedFines);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setCsvText("");
    setSelectedFine(null);
    setRowCount(0);
    setFineCount(0);
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
            empty cells (absences) using dormer emails as unique identifiers, with names as additional reference.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-blue-50 p-4 rounded-md flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                <p className="font-semibold mb-1.5">CSV Format:</p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block w-fit">
                  Email, First Name, Last Name, 1/1/2026, 1/2/2026, ...
                </code>
              </div>
              
              <div className="space-y-1 text-xs">
                <p><strong>Empty cell:</strong> Marks absence (will generate fine)</p>
                <p><strong>Cell with "1":</strong> Marks attendance (no fine)</p>
                <p><strong>Date format:</strong> mm/dd/YYYY (e.g., 01/15/2026)</p>
                <p><strong>Best practice:</strong> Import ≤50 rows per batch for faster processing</p>
              </div>

              <a 
                href="https://docs.google.com/spreadsheets/d/1T0x4CuSUsBycX0nUJk3UUKYjGEnCTg2YLWRJG5bTVOU/edit?gid=0#gid=0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 font-medium text-xs inline-flex items-center gap-1 underline"
              >
                View sample spreadsheet
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {rowCount > 50 && (
            <div className="bg-yellow-50 p-4 rounded-md flex gap-3 border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Large Import Detected ({rowCount} students, ~{fineCount} fines)</p>
                <p className="text-xs">
                  Processing {rowCount} students with approximately {fineCount} fines. This might take a while. Consider splitting into smaller batches (50 students each) for better reliability and easier error tracking.
                </p>
              </div>
            </div>
          )}

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
            {isSubmitting 
              ? rowCount > 50 || fineCount > 100
                ? `Generating ~${fineCount} fines... This might take a while...`
                : "Generating fines..."
              : fineCount > 0 
                ? `Generate ~${fineCount} Fines` 
                : "Generate Fines"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
