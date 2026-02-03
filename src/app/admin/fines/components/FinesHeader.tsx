"use client";

import { Button } from "@/components/ui/button";
import { FileUp, Mail, Home } from "lucide-react";

interface FinesHeaderProps {
  onImportAttendance: () => void;
  onSendEmailReminders: () => void;
  onRoomFine: () => void;
}

export default function FinesHeader({ onImportAttendance, onSendEmailReminders, onRoomFine }: FinesHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 sm:gap-4">
      <div className="space-y-1 sm:space-y-1.5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#12372A] tracking-tight">
          Fines Management
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#12372A]">
          Generate fines and track payments for all residents
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={onRoomFine}
          className="w-full sm:w-auto border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all text-xs sm:text-sm"
          size={undefined}
        >
          <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Fine by Room
        </Button>
        <Button
          variant="outline"
          onClick={onSendEmailReminders}
          className="w-full sm:w-auto border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all text-xs sm:text-sm"
          size={undefined}
        >
          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Send Email Reminders
        </Button>
        <Button
          variant="outline"
          onClick={onImportAttendance}
          className="w-full sm:w-auto border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all text-xs sm:text-sm"
          size={undefined}
        >
          <FileUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Import CSV
        </Button>
      </div>
    </div>
  );
}
