import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ImportResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    errors: string[];
    successCount: number;
    errorCount: number;
}

export default function ImportResultModal({ isOpen, onClose, errors, successCount, errorCount }: ImportResultModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
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

                    {errors.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700 underline">Error Details:</p>
                            <div className="max-h-[200px] overflow-y-auto bg-gray-50 rounded-md p-3 border border-gray-200">
                                <div className="space-y-2">
                                    {errors.map((error, index) => {
                                        const isValidationError = error.includes('required') || error.includes('Invalid') || error.includes('format');
                                        const isDuplicateError = error.includes('already exists');
                                        const isNotFoundError = error.includes('not found');
                                        const isDatabaseError = error.includes('Failed to create');

                                        let errorType = 'error';
                                        if (isValidationError) errorType = 'validation';
                                        else if (isDuplicateError) errorType = 'duplicate';
                                        else if (isNotFoundError) errorType = 'not-found';
                                        else if (isDatabaseError) errorType = 'database';

                                        return (
                                            <div key={index} className={`p-2 rounded text-xs border-l-4 ${
                                                errorType === 'validation' ? 'border-yellow-400 bg-yellow-50 text-yellow-800' :
                                                errorType === 'duplicate' ? 'border-blue-400 bg-blue-50 text-blue-800' :
                                                errorType === 'not-found' ? 'border-orange-400 bg-orange-50 text-orange-800' :
                                                'border-red-400 bg-red-50 text-red-800'
                                            }`}>
                                                <div className="font-medium text-xs mb-1">
                                                    {errorType === 'validation' && 'Validation Error'}
                                                    {errorType === 'duplicate' && 'Duplicate Entry'}
                                                    {errorType === 'not-found' && 'Not Found'}
                                                    {errorType === 'database' && 'Database Error'}
                                                </div>
                                                <div className="whitespace-pre-wrap">{error}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className={undefined}>
                    <Button onClick={onClose} className="bg-[#2E7D32] hover:bg-[#1e5a24] text-white" variant={undefined} size={undefined}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
