"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CreditCard, ChevronDown, ChevronUp, Trash2, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dormer } from "../../dormers/types";
import { PaymentFines, PaymentFinesData } from "../types";
import { User } from "firebase/auth";
import { getStatusBadgeInfo } from "../../dormers/utils/badgeUtils";
import { formatDate } from "../utils/formatDate";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { deleteFinePayment, updateFinePaymentStatus } from "@/lib/admin/fines";
import { toast } from "sonner";

interface FinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormer: (Dormer & { fines: PaymentFinesData[] }) | null;
  onRecordPayment: (fine: PaymentFinesData) => void;
  onPayAll: () => void;
  user: User | null;
}

export default function FinesModal({
  isOpen,
  onClose,
  dormer,
  onRecordPayment,
  onPayAll,
  user,
}: FinesModalProps) {
  const { ConfirmDialog, confirm } = useConfirmDialog();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExcusing, setIsExcusing] = useState(false);
  const [expandedRemarks, setExpandedRemarks] = useState<Record<string, boolean>>({});
  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
  const [finesData, setFinesData] = useState<PaymentFinesData[]>([]);
  const [individualFines, setIndividualFines] = useState<PaymentFinesData[]>([]);
  const [roomFines, setRoomFines] = useState<PaymentFinesData[]>([]);
  const [isPayingAll, setIsPayingAll] = useState(false);

  // update finesData when dormer changes and separate room fines from individual fines
  useEffect(() => {
    if (dormer?.fines) {
      const sortedFines = [...dormer.fines].sort((a, b) => {
        const dateA = a.dateImposed instanceof Date ? a.dateImposed : (a.dateImposed as any)?.toDate?.() || new Date();
        const dateB = b.dateImposed instanceof Date ? b.dateImposed : (b.dateImposed as any)?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      });
      
      // separate room fines from individual fines
      const roomFinesList = sortedFines.filter(fine => fine.roomFineId);
      const individualFinesList = sortedFines.filter(fine => !fine.roomFineId);
      
      setFinesData(sortedFines);
      setIndividualFines(individualFinesList);
      setRoomFines(roomFinesList);
    }
  }, [dormer?.fines]);

  const toggleRemarks = (fineId: string) => {
    setExpandedRemarks(prev => ({
      ...prev,
      [fineId]: !prev[fineId]
    }));
  };

  const handleDeleteFine = async (fine: PaymentFinesData) => {
    const confirmed = await confirm({
      title: "Delete Fine",
      description: `Are you sure you want to permanently delete this charged fine? This action cannot be undone and will remove all associated payment records.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (confirmed) {
      setIsDeleting(true);
      try {
        await deleteFinePayment(fine.id);
        toast.success("Fine deleted successfully");
        onClose(); // Close the modal after successful delete
      } catch (error) {
        console.error("Error deleting fine:", error);
        toast.error("Failed to delete fine");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleExcuseFine = async (fine: PaymentFinesData) => {
    const confirmed = await confirm({
      title: "Excuse Fine",
      description: `Are you sure you want to excuse this fine? The fine will be marked as excused and will not be included in the total fines calculation.`,
      confirmText: "Excuse",
      cancelText: "Cancel",
      variant: "default",
    });

    if (confirmed) {
      setIsExcusing(true);
      try {
        await updateFinePaymentStatus(fine.id, "Excused", user?.email || user?.uid || "");
        toast.success("Fine excused successfully");
        onClose(); // Close the modal after successful excuse
      } catch (error) {
        console.error("Error excusing fine:", error);
        toast.error("Failed to excuse fine");
      } finally {
        setIsExcusing(false);
      }
    }
  };

  // calculate total unpaid amount (excluding excused fines)
  const totalUnpaidAmount = finesData
    .filter(fine => fine.status !== "Paid" && fine.status !== "Excused")
    .reduce((sum, fine) => sum + (fine.totalAmountDue - fine.amountPaid), 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-3xl lg:max-w-5xl max-w-[95vw] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className={undefined}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-red-100 text-red-800">
                  {dormer?.firstName?.[0] || "?"}
                  {dormer?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className={undefined}>
                  {dormer?.firstName || "Unknown"} {dormer?.lastName || "Dormer"} - Fines
                </DialogTitle>
                <DialogDescription className={undefined}>
                  Room {dormer?.roomNumber || "N/A"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {totalUnpaidAmount > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Unpaid</div>
                  <div className="text-lg font-semibold text-red-600">
                    ₱{totalUnpaidAmount.toFixed(2)}
                  </div>
                </div>
              )}
              {finesData.some(fine => fine.status !== "Paid" && fine.status !== "Excused") && (
                <Button
                    onClick={() => setShowPayAllConfirm(true)}
                    disabled={isPayingAll}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    variant={undefined} size={undefined}                >
                  <CreditCard className="h-4 w-4 mr-2" /> Pay All
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4 overflow-x-auto">
          <Tabs defaultValue="fines" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fines" className={undefined}>
                Fines
              </TabsTrigger>
              <TabsTrigger value="details" className={undefined}>
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="fines"
              className="py-4 max-h-[60vh] overflow-y-auto space-y-6"
            >
              {/* room fines section - only show if there are room fines */}
              {roomFines.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-5 w-1 bg-blue-600 rounded"></div>
                    <h3 className="text-sm font-semibold text-gray-700">Shared Fines by Room</h3>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                      {roomFines.filter(f => f.status !== "Paid" && f.status !== "Excused").length} Active
                    </Badge>
                  </div>
                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardContent className="p-4 space-y-3">
                      {roomFines.map((fine) => {
                        const statusForBadge = fine.status === "Excused" ? "Paid" : (fine.status as "Paid" | "Unpaid" | "Partially Paid" | "Overdue");
                        const { className, Icon } = getStatusBadgeInfo(statusForBadge as "Paid" | "Unpaid" | "Partially Paid" | "Overdue");
                        const isPaid = fine.status === "Paid";
                        const isExcused = fine.status === "Excused";
                        const isInactive = isPaid || isExcused;
                        
                        return (
                          <div key={fine.id} className={`flex items-center justify-between p-3 rounded-md border ${isInactive ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'}`}>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{fine.finesRemarks}</p>
                                <Badge className={className} variant={undefined}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {fine.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                <span>Amount: ₱{fine.totalAmountDue.toFixed(2)}</span>
                                <span>•</span>
                                <span>Imposed: {formatDate(fine.dateImposed || fine.createdAt)}</span>
                                {isPaid && fine.paymentDate && (
                                  <>
                                    <span>•</span>
                                    <span className="text-green-600">Paid: {formatDate(fine.paymentDate)}</span>
                                  </>
                                )}
                              </div>
                              
                              {/* imposed by and recorded by */}
                              <div className="flex items-center gap-6 text-xs">
                                {fine.imposedBy && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Imposed by:</span>
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5 border border-[#A5D6A7]">
                                        <AvatarFallback className="bg-[#A5D6A7] text-[#2E7D32] text-[10px] font-semibold">
                                          {fine.imposedBy.firstName?.[0] || ''}
                                          {fine.imposedBy.lastName?.[0] || ''}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-gray-700 font-medium">
                                        {fine.imposedBy.firstName} {fine.imposedBy.lastName || ''}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {fine.recordedBy && (fine.status === "Paid" || fine.status === "Excused") && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Recorded by:</span>
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5 border border-[#A5D6A7]">
                                        <AvatarFallback className="bg-[#A5D6A7] text-[#2E7D32] text-[10px] font-semibold">
                                          {fine.recordedBy.firstName?.[0] || ''}
                                          {fine.recordedBy.lastName?.[0] || ''}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-gray-700 font-medium">
                                        {fine.recordedBy.firstName} {fine.recordedBy.lastName || ''}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {isPaid && fine.notes && typeof fine.notes === 'string' && (fine.notes as string).includes('Cleared:') && (
                                <p className="text-xs text-blue-600 italic">{fine.notes}</p>
                              )}
                            </div>
                            <div className="ml-4 flex gap-2">
                              {!isInactive && (
                                <Button
                                  onClick={() => onRecordPayment(fine)}
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                                  disabled={isDeleting || isExcusing}
                                >
                                  Pay Fine
                                </Button>
                              )}
                              {!isInactive && (
                                <Button
                                  size="sm"
                                  onClick={() => handleExcuseFine(fine)}
                                  className="h-9 bg-yellow-600 hover:bg-yellow-700 text-white"
                                  variant={undefined}
                                  disabled={isDeleting || isExcusing}
                                  title="Excuse fine"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {!isInactive && (
                                <Button
                                  size="sm"
                                  onClick={() => handleDeleteFine(fine)}
                                  className="h-9 bg-red-600 hover:bg-red-700 text-white"
                                  variant={undefined}
                                  disabled={isDeleting || isExcusing}
                                  title="Delete fine"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* individual fines section */}
              {individualFines.length > 0 && (
                <div className="space-y-3">
                  {roomFines.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-5 w-1 bg-gray-600 rounded"></div>
                      <h3 className="text-sm font-semibold text-gray-700">Individual Fines</h3>
                    </div>
                  )}
              <Table className={undefined}>
                <TableHeader className={undefined}>
                  <TableRow className={undefined}>
                    <TableHead className={undefined}>Date Imposed</TableHead>
                    <TableHead className={undefined}>Amount Due</TableHead>
                    <TableHead className={undefined}>Imposed by</TableHead>
                    <TableHead className={undefined}>Amount Paid</TableHead>
                    <TableHead className={undefined}>Date Paid</TableHead>
                    <TableHead className="max-w-[20ch]">Remarks</TableHead>
                    <TableHead className={undefined}>Recorded by</TableHead>
                    <TableHead className={undefined}>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={undefined}>
                  {individualFines.map((fine) => {
                    const statusForBadge = fine.status === "Excused" ? "Paid" : (fine.status as "Paid" | "Unpaid" | "Partially Paid" | "Overdue");
                    const { className, Icon } = getStatusBadgeInfo(statusForBadge);
                    const isExpanded = expandedRemarks[fine.id] || false;
                    const shouldTruncate = fine.finesRemarks && fine.finesRemarks.length > 20;
                    
                    return (
                      <React.Fragment key={fine.id}>
                        <TableRow className={undefined}>
                          <TableCell className="w-[150px]">
                            <span className="truncate block" title={(() => {
                              const date = fine.dateImposed || fine.createdAt;
                              const dateObj = date instanceof Date ? date : date.toDate();
                              return dateObj.toString();
                            })()}>
                              {formatDate(fine.dateImposed || fine.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="w-[120px]">
                            ₱{fine.totalAmountDue.toFixed(2)}
                          </TableCell>
                          <TableCell className="w-[140px]">
                            {fine.imposedBy ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border-2 border-[#A5D6A7]">
                                  <AvatarFallback className="bg-[#A5D6A7] text-[#2E7D32] text-xs font-semibold">
                                    {fine.imposedBy.firstName?.[0] || ''}
                                    {fine.imposedBy.lastName?.[0] || ''}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-[#333333] max-w-[200px] truncate" title={`${fine.imposedBy.firstName} ${fine.imposedBy.lastName || ''}`}>
                                    {fine.imposedBy.firstName} {fine.imposedBy.lastName || ''}
                                  </div>
                                  <div className="text-xs text-gray-500 max-w-[200px] truncate" title={fine.imposedBy.email}>
                                    {fine.imposedBy.email}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            ₱{(fine.amountPaid || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            {fine.paymentDate ? <span className="truncate block" title={(fine.paymentDate instanceof Date ? fine.paymentDate : fine.paymentDate.toDate()).toString()}>
                              {formatDate(fine.paymentDate)}
                            </span> : "-"}
                          </TableCell>
                          <TableCell className="max-w-[20ch]">
                            <div className="flex items-start max-w-[20ch]">
                              <div className={`flex-1 ${shouldTruncate ? 'line-clamp-2 max-w-[20ch]' : ''} break-words pr-2`}>
                                {fine.finesRemarks || "-"}
                              </div>
                              {fine.finesRemarks && fine.finesRemarks.length > 20 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRemarks(fine.id)}
                                  className="h-6 w-6 p-0 flex-shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-[140px]">
                            {fine.status === "Unpaid" ? (
                              <span className="text-sm text-gray-500">No Record</span>
                            ) : fine.recordedBy ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border-2 border-[#A5D6A7]">
                                  <AvatarFallback className="bg-[#A5D6A7] text-[#2E7D32] text-xs font-semibold">
                                    {fine.recordedBy.firstName?.[0] || ''}
                                    {fine.recordedBy.lastName?.[0] || ''}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-[#333333] max-w-[200px] truncate" title={`${fine.recordedBy.firstName} ${fine.recordedBy.lastName || ''}`}>
                                    {fine.recordedBy.firstName} {fine.recordedBy.lastName || ''}
                                  </div>
                                  <div className="text-xs text-gray-500 max-w-[200px] truncate" title={fine.recordedBy.email}>
                                    {fine.recordedBy.email}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[140px]">
                            <Badge className={className} variant={undefined}>
                              {Icon && <Icon className="h-4 w-4 mr-1 flex-shrink-0" />}
                              <span className="truncate">{fine.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right w-[180px]">
                            <div className="flex gap-2 justify-end">
                              {(fine.status === "Unpaid" ||
                                fine.status === "Partially Paid") && (
                                <Button
                                  size="sm"
                                  onClick={() => onRecordPayment(fine)}
                                  className="h-8 bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                                  variant={undefined}
                                  disabled={isDeleting || isExcusing}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" /> Pay
                                </Button>
                              )}
                              {(fine.status === "Unpaid" ||
                                fine.status === "Partially Paid") && (
                                <Button
                                  size="sm"
                                  onClick={() => handleExcuseFine(fine)}
                                  className="h-8 bg-yellow-600 hover:bg-yellow-700 text-white"
                                  variant={undefined}
                                  disabled={isDeleting || isExcusing}
                                  title="Excuse fine"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {fine.status !== "Paid" && fine.status !== "Excused" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleDeleteFine(fine)}
                                  className="h-8 bg-red-600 hover:bg-red-700 text-white"
                                  variant={undefined}
                                  disabled={isDeleting || isExcusing}
                                  title="Delete fine"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded remarks row */}
                        {isExpanded && fine.finesRemarks && fine.finesRemarks.length > 20 && (
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableCell colSpan={7} className="p-0 border-t-0">
                              <div className="p-3 pl-[200px] bg-gray-50 border-t border-gray-200">
                                <div className="font-medium text-sm text-gray-600 mb-1">
                                  Full Remarks:
                                </div>
                                <div className="text-gray-800 whitespace-pre-wrap break-words bg-white p-3 rounded border border-gray-200">
                                  {fine.finesRemarks}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {individualFines.length === 0 && roomFines.length === 0 && (
                    <TableRow className={undefined}>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="text-gray-500 text-lg font-medium">No fines found</div>
                          <div className="text-gray-400 text-sm">
                            This dormer doesn't have any fines recorded yet.
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
                </div>
              )}

              {/* empty state when no fines at all */}
              {individualFines.length === 0 && roomFines.length === 0 && (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-gray-500 text-lg font-medium">No fines found</div>
                    <div className="text-gray-400 text-sm">
                      This dormer doesn't have any fines recorded yet.
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={undefined}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Email</Label>
                      <p>{dormer?.email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Phone</Label>
                      <p>{dormer?.phone || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={undefined}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Dormitory Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">
                        Room Number
                      </Label>
                      <p>{dormer?.roomNumber || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Date Added
                      </Label>
                      <p>
                        {dormer?.createdAt
                          ? new Date(
                              dormer.createdAt.seconds * 500
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>

    {/* Pay All Confirmation Dialog */}
    <Dialog open={showPayAllConfirm} onOpenChange={setShowPayAllConfirm}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>Confirm Pay All</DialogTitle>
          <DialogDescription className={undefined}>
            Are you sure you want to mark all unpaid fines for {dormer?.firstName || "Unknown"} {dormer?.lastName || "Dormer"} as paid? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={undefined}>
          <Button
              variant="outline"
              onClick={() => setShowPayAllConfirm(false)} className={undefined} size={undefined}          >
            Cancel
          </Button>
          <Button
              onClick={async () => {
                setIsPayingAll(true);
                try {
                  await onPayAll();
                  setFinesData(prevFines => prevFines.map(fine => fine.status !== "Paid"
                    ? {
                      ...fine,
                      status: "Paid",
                      amountPaid: fine.totalAmountDue,
                      remainingBalance: 0,
                      paymentDate: new Date()
                    }
                    : fine
                  )
                  );
                  setShowPayAllConfirm(false);
                  onClose(); 
                } catch (error) {
                  setShowPayAllConfirm(false);
                } finally {
                  setIsPayingAll(false);
                }
              } }
              disabled={isPayingAll}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" variant={undefined} size={undefined}          >
            {isPayingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              "Confirm Pay All"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog />
    </>
  );
}