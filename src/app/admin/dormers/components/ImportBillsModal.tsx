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
import { FileUp, Info, ExternalLink, AlertCircle } from "lucide-react";
import { generateBillingPeriods } from "@/app/admin/dormers/utils/generateBillUtils";
import { Payable, ImportedBill } from "../types";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";

export interface ImportBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (bills: ImportedBill[], payable: Payable | null) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  isSubmitting: boolean;
  payables: Payable[];
}

export default function ImportBillsModal({
  isOpen,
  onClose,
  onImport,
  isSubmitting,
  payables,
}: ImportBillsModalProps) {
  const [csvText, setCsvText] = useState("");
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [billCount, setBillCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {dormitoryName} = useCurrentDormitoryId();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    const lines = text.trim().split("\n").filter(line => line.trim());
    // subtract header row
    const dataRows = lines.length > 0 && lines[0].toLowerCase().includes('email') ? lines.length - 1 : lines.length;
    setRowCount(dataRows);
    
    // Rough estimate: count non-empty cells in billing period columns (starting from index 3)
    let estimatedBills = 0;
    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('email')) return; // Skip header
      const cells = line.split(',');
      if (cells.length > 3) {
        // Count non-empty billing period cells (columns after first 3)
        estimatedBills += cells.slice(3).filter(cell => cell.trim() && cell.trim() !== '').length;
      }
    });
    setBillCount(estimatedBills);
  };

  const parseBillsCSV = (text: string, selectedPayable: Payable | null) => {
    const errors: string[] = [];

    if (!selectedPayable) {
      errors.push("Please select a payable type before importing.");
      return { bills: [], errors };
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      errors.push("Invalid CSV format: File must contain at least a header row and one data row.");
      return { bills: [], errors };
    }

    const bills: ImportedBill[] = [];

    const headers = lines[0].split(",").map((h) => h.trim());
    if (headers.length < 4) {
      errors.push("Invalid CSV format: Must have at least 4 columns (Email, First Name, Last Name, and billing period columns).");
      return { bills, errors };
    }

    if (headers[0].toLowerCase() !== "email" || headers[1].toLowerCase() !== "first name" || headers[2].toLowerCase() !== "last name") {
      errors.push(`Invalid CSV headers: First three columns must be "Email", "First Name", "Last Name". Found: "${headers[0]}", "${headers[1]}", "${headers[2]}".`);
      return { bills, errors };
    }

    // validate billing period headers (columns 4+)
    const billingPeriods = headers.slice(3);
    if (billingPeriods.length === 0) {
      errors.push("No billing period columns found. Please include at least one billing period column.");
      return { bills, errors };
    }

    const {dormitoryName} = useCurrentDormitoryId();

    const validPeriods = generateBillingPeriods(dormitoryName);
    const validPeriodLabels = validPeriods.map(p => p.label);
    // Create a map from label to value for consistent storage
    const labelToValueMap = new Map(validPeriods.map(p => [p.label, p.value]));

    for (let j = 0; j < billingPeriods.length; j++) {
      const period = billingPeriods[j].trim();
      if (!period) {
        errors.push(`Column ${j + 4}: Billing period header is empty.`);
      } else if (!validPeriodLabels.includes(period)) {
        errors.push(`Column ${j + 4}: Invalid billing period "${period}". Must match one of the system-defined billing periods.`);
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

      // Process billing periods - create bills for non-empty cells
      for (let j = 3; j < parts.length && j < headers.length; j++) {
        const value = parts[j]?.trim();
        // Non-empty cell indicates billing for that period
        if (value && value !== "") {
          const billingPeriodLabel = headers[j];

          if (!billingPeriodLabel || !billingPeriodLabel.trim()) {
            errors.push(`Row ${rowNumber}: Invalid billing period "${billingPeriodLabel}".`);
            continue;
          }

          // Map the label to its consistent value for storage
          const billingPeriodValue = labelToValueMap.get(billingPeriodLabel);
          if (!billingPeriodValue) {
            errors.push(`Row ${rowNumber}: Could not map billing period "${billingPeriodLabel}" to a valid value.`);
            continue;
          }

          bills.push({
            email: email,
            firstName: firstName,
            lastName: lastName,
            billingPeriod: billingPeriodValue, // Use the consistent value, not the label
            rowNumber: rowNumber,
          });
        }
      }
    }

    return { bills, errors };
  };

  const handleImport = async () => {
    const { bills, errors: parsingErrors } = parseBillsCSV(csvText, selectedPayable);

    if (parsingErrors.length > 0) {
      // pass parsing errors to the parent componenet for display in results modal
      const errorBills = parsingErrors.map(error => ({ 
        error, 
        isParsingError: true,
        email: "",
        firstName: "",
        lastName: "",
        billingPeriod: "",
        rowNumber: 0,
      }));
      await onImport(errorBills, selectedPayable);
      handleClose();
      return;
    }

    if (bills.length === 0) {
      toast.error("No bills found to import. Make sure to include non-empty values in billing period columns.");
      return;
    }

    await onImport(bills, selectedPayable);
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
      
      // Estimate bill count
      let estimatedBills = 0;
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes('email')) return;
        const cells = line.split(',');
        if (cells.length > 3) {
          estimatedBills += cells.slice(3).filter(cell => cell.trim() && cell.trim() !== '').length;
        }
      });
      setBillCount(estimatedBills);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setCsvText("");
    setSelectedPayable(null);
    setRowCount(0);
    setBillCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>
            Import Bills for Billing Periods
          </DialogTitle>
          <DialogDescription className={undefined}>
            Upload or paste CSV data to create bills for multiple dormers across different billing periods. Bills will be created using dormer emails as unique identifiers, with names as additional reference.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-blue-50 p-4 rounded-md flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                <p className="font-semibold mb-1.5">CSV Format:</p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block w-fit">
                  Email, First Name, Last Name, January 2026, February 2026, ...
                </code>
              </div>
              
              <div className="space-y-1 text-xs">
                <p><strong>Empty cell:</strong> No bill for that period</p>
                <p><strong>Cell with "1":</strong> Creates bill for that period</p>
                <p><strong>Billing periods:</strong> Must exactly match system-defined periods (see valid periods below)</p>
                <p><strong>Monthly date format:</strong> Month YYYY (January 2026)</p>
                <p><strong>Best practice:</strong> Import ≤50 rows per batch for faster processing</p>
              </div>
              <a 
                href="https://docs.google.com/spreadsheets/d/1J0rTGDXO44DDkFjjaajou-be3dVBTuz3cDL_x2nb2yM/edit?gid=0#gid=0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 font-medium text-xs inline-flex items-center gap-1 underline"
              >
                View sample spreadsheet
                <ExternalLink className="h-3 w-3" />
              </a>
              
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="font-semibold mb-1.5">Valid Billing Periods (Semestral/Monthly):</p>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto bg-blue-100 p-2 rounded">
                  {generateBillingPeriods(dormitoryName).map(period => (
                    <div key={period.value} className="font-medium text-blue-800">
                      {period.label}
                    </div>
                  ))}
                </div>
                <p className="text-xs italic text-blue-700 mt-2">
                  Column headers must exactly match the billing periods listed above
                </p>
              </div>              
            </div>
          </div>

          {rowCount > 50 && (
            <div className="bg-yellow-50 p-4 rounded-md flex gap-3 border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Large Import Detected ({rowCount} students, ~{billCount} bills)</p>
                <p className="text-xs">
                  Processing {rowCount} students with approximately {billCount} bills. This might take a while. Consider splitting into smaller batches (50 students each) for better reliability and easier error tracking.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Select Payable Type</label>
            <Select 
              onValueChange={(value) => setSelectedPayable(payables.find(p => p.id === value) || null)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={undefined}>
                <SelectValue placeholder="Choose a payable type" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {payables.map((payable) => (
                  <SelectItem key={payable.id} value={payable.id} className={undefined}>
                    {payable.name} - ₱{payable.amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPayable && (
              <p className="text-xs text-gray-500 mt-1">
                All imported bills will use ₱{selectedPayable.amount} as the amount due
              </p>
            )}
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
              placeholder="Email, First Name, Last Name, January 2026, February 2026, March 2026&#10;john.doe@email.com, John, Doe, 1, , 1&#10;jane.smith@email.com, Jane, Smith, 1, 1, 1"
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
            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
            onClick={handleImport}
            disabled={!csvText.trim() || !selectedPayable || isSubmitting}
            variant={undefined}
            size={undefined}
          >
            {isSubmitting 
              ? rowCount > 50 || billCount > 100
                ? `Creating ~${billCount} bills... This might take a while...`
                : "Creating bills..."
              : billCount > 0 
                ? `Create ~${billCount} Bills` 
                : "Create Bills"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
