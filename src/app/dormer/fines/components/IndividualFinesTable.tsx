"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { PaymentFinesData } from "@/app/admin/fines/types";
import { getStatusBadgeInfo } from "@/app/admin/dormers/utils/badgeUtils";
import { formatDate } from "@/app/admin/fines/utils/formatDate";

interface IndividualFinesTableProps {
  fines: PaymentFinesData[];
}

export default function IndividualFinesTable({ fines }: IndividualFinesTableProps) {
  const [expandedRemarks, setExpandedRemarks] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toggleRemarks = (fineId: string) => {
    setExpandedRemarks(prev => ({
      ...prev,
      [fineId]: !prev[fineId]
    }));
  };
  
  // Pagination logic
  const totalPages = Math.ceil(fines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFines = fines.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (fines.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="h-5 w-1 bg-gray-600 rounded"></div>
        <h3 className="text-sm font-semibold text-gray-700">Individual Fines</h3>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table className="">
          <TableHeader className="">
            <TableRow className="bg-[#f0f0f0] hover:bg-[#f0f0f0]">
              <TableHead className="font-bold text-[#12372A]">Date Imposed</TableHead>
              <TableHead className="font-bold text-[#12372A]">Amount Due</TableHead>
              <TableHead className="font-bold text-[#12372A]">Imposed by</TableHead>
              <TableHead className="font-bold text-[#12372A]">Amount Paid</TableHead>
              <TableHead className="font-bold text-[#12372A]">Date Paid</TableHead>
              <TableHead className="font-bold text-[#12372A] max-w-[20ch]">Remarks</TableHead>
              <TableHead className="font-bold text-[#12372A]">Recorded by</TableHead>
              <TableHead className="font-bold text-[#12372A]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="">
            {currentFines.map((fine) => {
              const { className, Icon } = getStatusBadgeInfo(fine.status);
              const isExpanded = expandedRemarks[fine.id] || false;
              const shouldTruncate = fine.finesRemarks && fine.finesRemarks.length > 20;
              
              return (
                <React.Fragment key={fine.id}>
                  <TableRow className="hover:bg-[#f0f0f0] transition-colors">
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
                      {fine.paymentDate ? (
                        <span className="truncate block" title={(fine.paymentDate instanceof Date ? fine.paymentDate : fine.paymentDate.toDate()).toString()}>
                          {formatDate(fine.paymentDate)}
                        </span>
                      ) : "-"}
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
                  </TableRow>
                  
                  {/* Expanded remarks row */}
                  {isExpanded && fine.finesRemarks && fine.finesRemarks.length > 20 && (
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell colSpan={8} className="p-0 border-t-0">
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
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, fines.length)} of {fines.length} fines
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
