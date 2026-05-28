import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, Mail } from "lucide-react";

interface ImportErrorModalsProps {
    isOpen: boolean;
    onClose: () => void;
    errors: any[];
    successCount: number;
    errorCount: number;
    emailsSent?: number;
    emailsFailed?: number;
}

export default function ImportResultModal({ isOpen, onClose, errors, successCount, errorCount, emailsSent, emailsFailed }: ImportErrorModalsProps) {
    const showEmailRow = typeof emailsSent === "number" || typeof emailsFailed === "number";
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className={undefined}>
                    <DialogTitle className="flex items-center gap-2 font-bold text-xl">
                        <AlertCircle className="h-5 w-5 text-[#2E7D32]" />
                        Import Results
                    </DialogTitle>
                    <DialogDescription className={undefined}>
                        The import process has completed. Below is a summary of the results.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center justify-center border border-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
                            <span className="text-2xl font-bold text-green-700">{successCount}</span>
                            <span className="text-xs text-green-600 uppercase font-semibold">Successful</span>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg flex flex-col items-center justify-center border border-red-100">
                            <XCircle className="h-8 w-8 text-red-600 mb-2" />
                            <span className="text-2xl font-bold text-red-700">{errorCount}</span>
                            <span className="text-xs text-red-600 uppercase font-semibold">Failed</span>
                        </div>
                    </div>

                    {showEmailRow && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span><strong>{emailsSent ?? 0}</strong> notification email(s) sent
                                {typeof emailsFailed === "number" && emailsFailed > 0 && (
                                    <span className="text-red-600">, <strong>{emailsFailed}</strong> failed</span>
                                )}.
                            </span>
                        </div>
                    )}

                    {errors.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700 underline">Error Details:</p>
                            <div className="max-h-[150px] overflow-y-auto bg-gray-50 rounded-md p-3 border border-gray-200">
                                <ul className="space-y-1.5 list-disc list-inside">
                                    {errors.map((error, index) => (
                                        <li key={index} className="text-xs text-red-600 whitespace-pre-wrap">
                                            {error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-start">
                    <Button
                        onClick={onClose}
                        className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
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