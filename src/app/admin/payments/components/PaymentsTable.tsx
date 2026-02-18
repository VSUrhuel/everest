"use client";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, CreditCard, Calendar, Receipt } from "lucide-react";
import { Bill } from "../../dormers/types";
import { getStatusBadgeInfo } from "../../dormers/utils/badgeUtils";
import { getBillingPeriodLabel } from "../../dormers/utils/generateBillUtils";

/**
 * @param {{
 * bills: any[];
 * onViewDetails: (bill: any) => void;
 * onRecordbill: (bill: any) => void;
 * }} props
 */

interface billsTableProps {
  bills: Bill[];
  onViewDetails: (bill: Bill) => void;
  onRecordPayment: (bill: Bill) => void;
}

export default function billsTable({
  bills,
  onViewDetails,
  onRecordPayment,
}: billsTableProps) {
  const formatCurrency = (amount: any) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="border-2 border-gray-100 shadow-md bg-white gap-0">
      <CardHeader className="border-b pt-0 border-gray-100 pb-0">
        <CardTitle className="text-xl md:text-2xl font-bold text-[#12372A]">
          Bill Records
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Complete list of all bills and payment status</p>
      </CardHeader>
      <CardContent className="p-0">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#A5D6A7]/20 rounded-full blur-2xl"></div>
              <div className="relative p-6 rounded-full bg-[#2E7D32]">
                <Receipt className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[#333333] mb-2">
              No bills found
            </h3>
            
            <p className="text-sm text-gray-600 text-center max-w-md mb-6">
              No bills have been generated yet. Generate bills for dormers from the Dormers page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto px-5">
            <Table className={undefined}>
              <TableHeader className={undefined}>
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="font-semibold text-gray-700">Resident</TableHead>
                  <TableHead className="font-semibold text-gray-700">Remarks</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Amount Due</TableHead>
                  <TableHead className="font-semibold text-gray-700">Amount Paid</TableHead>
                  <TableHead className="font-semibold text-gray-700">Remaining Balance</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={undefined}>
                {bills.map((bill) => {
                  const { className, Icon } = getStatusBadgeInfo(bill.status);

                  return (
                    <TableRow className="hover:bg-gray-50 transition-colors border-b border-gray-50" key={bill.id}>
                      <TableCell className="font-medium w-[200px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-[#A5D6A7] flex-shrink-0">
                            <AvatarFallback className="bg-[#A5D6A7] text-[#2E7D32] font-semibold">
                              {bill.dormer.firstName[0]}
                              {bill.dormer.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[#333333] max-w-[200px] truncate" title={`${bill.dormer.firstName} ${bill.dormer.lastName}`}>
                              {bill.dormer.firstName} {bill.dormer.lastName}
                            </div>
                            <div className="text-xs text-gray-500 truncate" title={`Room ${bill.dormer.roomNumber} • ${getBillingPeriodLabel(bill.billingPeriod)}`}>
                              Room {bill.dormer.roomNumber} • {getBillingPeriodLabel(bill.billingPeriod)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <div className="text-sm text-gray-600 truncate max-w-[180px]" title={bill.description || "N/A"}>
                          {bill.description || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="font-semibold text-[#333333]">
                          {formatCurrency(bill.totalAmountDue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getBillingPeriodLabel(bill.billingPeriod)}
                        </div>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="font-semibold text-[#2E7D32]">
                          {formatCurrency(bill.amountPaid)}
                        </div>
                        {bill.billDate && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatDate(bill.billDate)}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="w-[130px]">
                        <div
                          className={`font-semibold ${
                            bill.remainingBalance > 0
                              ? "text-red-600"
                              : "text-[#2E7D32]"
                          }`}
                        >
                          {formatCurrency(bill.remainingBalance)}
                        </div>
                      </TableCell>
                      <TableCell className="w-[140px]">
                        <Badge className={className} variant={undefined}>
                          {Icon && <Icon className="h-4 w-4 mr-1 flex-shrink-0" />}
                          <span className="truncate">{bill.status}</span>
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right w-[180px]">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(bill)}
                            className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white transition-all font-medium"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          {bill.status !== "Paid" && (
                            <Button
                              size="sm"
                              onClick={() => onRecordPayment(bill)}
                              className="bg-[#2E7D32] hover:bg-[#A5D6A7] text-white font-semibold transition-all"
                              variant="default"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {bills.length === 0 && (
                  <TableRow className={undefined}>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="text-gray-400 text-4xl">💳</div>
                        <div className="text-gray-500 text-lg font-medium">No payments found</div>
                        <div className="text-gray-400 text-sm">
                          No payment records available for the selected filters.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
