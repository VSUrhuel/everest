"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  progress?: number;
  total?: number;
  showPercentage?: boolean;
}

export function ProgressModal({
  isOpen,
  title = "Processing...",
  message = "Please wait while we process your data",
  progress,
  total,
  showPercentage = true,
}: ProgressModalProps) {
  const percentage =
    progress && total ? Math.round((progress / total) * 100) : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogHeader className={undefined}>
        <DialogTitle className="text-lg font-semibold text-gray-900">
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 text-[#2E7D32] animate-spin" />
          </div>

          <div className="text-center space-y-2 w-full px-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>

            {progress !== undefined && total !== undefined && (
              <div className="space-y-2 pt-2">
                <Progress value={percentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {progress} of {total} items
                  </span>
                  {showPercentage && percentage !== undefined && (
                    <span>{percentage}%</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
