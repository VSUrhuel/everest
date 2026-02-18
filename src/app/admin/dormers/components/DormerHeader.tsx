"use client";

import { Button } from "../../../../components/ui/button";
import { FileDown, FileUp, Plus } from "lucide-react";

interface DormerHeaderProps {
  onAddDormer: () => void;
  onImport: () => void;
  onImportBills: () => void;
  onExport: () => void;
}

export default function DormerHeader({ onAddDormer, onImport, onImportBills, onExport }: DormerHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 sm:gap-4">
      <div className="space-y-1 sm:space-y-1.5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#12372A] tracking-tight">
          Dormer Management
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#12372A]">
          Generate bills and track payments for all residents
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={onExport}
          className="w-full sm:w-auto border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all text-xs sm:text-sm"
          size={undefined}
        >
          <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          onClick={onImportBills}
          className="w-full sm:w-auto border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all text-xs sm:text-sm"
          size={undefined}
        >
          <FileUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Import Bills
        </Button>
        <Button
          variant="outline"
          onClick={onImport}
          className="w-full sm:w-auto border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all text-xs sm:text-sm"
          size={undefined}
        >
          <FileUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Import Dormers
        </Button>
        <Button
          className="w-full sm:w-auto bg-[#2E7D32] hover:bg-[#A5D6A7] text-white font-semibold transition-all text-xs sm:text-sm"
          onClick={onAddDormer}
          variant={undefined}
          size={undefined}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Add Dormer
        </Button>
      </div>
    </div>
  );
}
