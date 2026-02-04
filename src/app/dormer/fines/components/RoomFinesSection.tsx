"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaymentFinesData } from "@/app/admin/fines/types";
import { getStatusBadgeInfo } from "@/app/admin/dormers/utils/badgeUtils";
import { formatDate } from "@/app/admin/fines/utils/formatDate";

interface RoomFinesSectionProps {
  roomFines: PaymentFinesData[];
}

export default function RoomFinesSection({ roomFines }: RoomFinesSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  if (roomFines.length === 0) return null;

  // Pagination logic
  const totalPages = Math.ceil(roomFines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFines = roomFines.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="h-5 w-1 bg-blue-600 rounded"></div>
        <h3 className="text-sm font-semibold text-gray-700">Shared Fines by Room</h3>
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
          {roomFines.filter(f => f.status !== "Paid").length} Active
        </Badge>
      </div>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4 space-y-3">
          {currentFines.map((fine) => {
            const { className, Icon } = getStatusBadgeInfo(fine.status);
            const isPaid = fine.status === "Paid";
            
            return (
              <div key={fine.id} className={`flex items-center justify-between p-3 rounded-md border ${isPaid ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'}`}>
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
                  
                  {/* Imposed by and Recorded by */}
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
                    
                    {isPaid && fine.recordedBy && (
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
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, roomFines.length)} of {roomFines.length} fines
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
