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
import { DormerData } from "../types";
import { FileUp, Info, AlertCircle } from "lucide-react";

interface ImportDormerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dormers: DormerData[]) => Promise<void>;
  isSubmitting: boolean;
}

export default function ImportDormerModal({
  isOpen,
  onClose,
  onImport,
  isSubmitting,
}: ImportDormerModalProps) {
  const [csvText, setCsvText] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    const lines = text.trim().split("\n").filter(line => line.trim());
    setRowCount(lines.length);
  };

  const parseCSV = (text: string): DormerData[] => {
    const lines = text.trim().split("\n");
    if (lines.length === 0) return [];

    const dormers: DormerData[] = [];
    
    lines.forEach((line, index) => {
      // Split by comma, but handle potential quoted strings (basic CSV handling)
      const parts = line.split(",").map(part => part.trim());
      
      if (parts.length >= 5) {
        const [firstName, lastName, email, phone, roomNumber] = parts;
        
        // Basic validation for email
        if (email && email.includes("@")) {
          dormers.push({
            id: "",
            firstName,
            lastName,
            email,
            phone,
            roomNumber,
            role: "User", // Default to User
            dormerId: "",
          });
        }
      }
    });

    return dormers;
  };

  const handleImport = async () => {
    const dormers = parseCSV(csvText);
    if (dormers.length === 0) {
      toast.error("No valid dormer data found. Please check your format.");
      return;
    }
    await onImport(dormers);
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
      setRowCount(lines.length);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setCsvText("");
    setRowCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>Import Dormers</DialogTitle>
          <DialogDescription className={undefined}>
            Bulk import residents using CSV format or by pasting data below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-blue-50 p-4 rounded-md flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Required CSV Format:</p>
              <code className="bg-blue-100 px-1 py-0.5 rounded">
                First Name, Last Name, Email, Phone, Room Number
              </code>
              <p className="mt-2 text-xs italic">
                * Each resident must be on a new line. All residents will be assigned the "User" role.
              </p>
              <p className="mt-2 text-xs font-semibold text-blue-900">
                💡 Best Practice: Import in batches of 50 rows or less to minimize errors and ensure faster processing.
              </p>
            </div>
          </div>

          {rowCount > 50 && (
            <div className="bg-yellow-50 p-4 rounded-md flex gap-3 border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Large Import Detected ({rowCount} rows)</p>
                <p className="text-xs">
                  You're importing {rowCount} rows. This might take a while to process. Consider splitting into smaller batches (50 rows each) for better reliability and easier error handling.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Paste CSV Data</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs border-dashed"
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
              />
            </div>
            <Textarea
              placeholder="John, Doe, john.doe@example.com, 09123456789, Room 1&#10;Jane, Smith, jane.smith@example.com, 09987654321, Room 2"
              className="min-h-[200px] font-mono text-xs"
              value={csvText}
              onChange={handleTextChange}
            />
          </div>
        </div>

        <DialogFooter className={undefined}>
          <Button
            variant="outline"
            onClick={handleClose}
            className={undefined}
            size={undefined}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
            onClick={handleImport}
            disabled={!csvText.trim() || isSubmitting}
            variant={undefined}
            size={undefined}
          >
            {isSubmitting 
              ? rowCount > 50 
                ? `Importing ${rowCount} dormers... This might take a while...` 
                : "Importing dormers..." 
              : `Import ${rowCount > 0 ? `${rowCount} ` : ""}Dormers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
