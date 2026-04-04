"use client";

import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Calendar,
  XCircle,
  AlertCircle,
  Users,
} from "lucide-react";
import { EventDormerData } from "../types";
import { Timestamp } from "firebase/firestore";

interface EventDormersTableProps {
  dormers: EventDormerData[];
  onLogPayment: (dormer: EventDormerData) => void;
  eventAmount: number;
}

export default function EventDormersTable({
  dormers,
  onLogPayment,
  eventAmount,
}: EventDormersTableProps) {
  const getStatusBadge = (status : string) => {
    const statusConfig = {
      Paid: {
        variant: "default",
        className: "bg-[#A5D6A7] text-[#2E7D32] hover:bg-[#A5D6A7] font-semibold",
        icon: CheckCircle,
      },
      Partial: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 font-semibold",
        icon: Clock,
      },
      Unpaid: {
        variant: "destructive",
        className: "bg-red-100 text-red-800 hover:bg-red-100 font-semibold",
        icon: XCircle,
      },
      Overdue: {
        variant: "destructive",
        className: "bg-red-100 text-red-800 hover:bg-red-100 font-semibold",
        icon: AlertCircle,
      },
    };

    return statusConfig[status] || statusConfig["Unpaid"];
  };

  const formatCurrency = (amount : number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (dateString : Timestamp) => {
    if (!dateString) return "N/A";
    return new Date(dateString.toMillis()).toLocaleDateString();
  };

  return (
    <Card className="border-2 border-gray-100 shadow-md bg-white">
      <CardHeader className="border-b border-gray-100">
        <div>
          <CardTitle className="text-xl md:text-2xl font-bold text-[#12372A]">
            Dormer Payment Status
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Track individual payment progress for this event</p>
        </div>
      </CardHeader>
      <CardContent className={undefined}>
        {dormers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="relative mb-6 inline-block">
              <div className="absolute inset-0 bg-gray-100/50 rounded-full blur-2xl"></div>
              <div className="relative p-6 rounded-full bg-[#E0E0E0]">
                <Users className="h-12 w-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#333333] mb-2">No Dormers Found</h3>
            <p className="text-gray-600 mb-4">
              There are no dormers assigned to this event yet.
            </p>
          </div>
        ) : (
          <Table className={undefined}>
            <TableHeader className={undefined}>
              <TableRow className="bg-[#f0f0f0] hover:bg-[#f0f0f0]">
                <TableHead className="font-bold text-[#12372A]">Dormer</TableHead>
                <TableHead className="font-bold text-[#12372A]">Amount Paid</TableHead>
                <TableHead className="font-bold text-[#12372A]">Payment Status</TableHead>
                <TableHead className="hidden md:table-cell font-bold text-[#12372A]">
                  Payment Date
                </TableHead>
                <TableHead className="hidden lg:table-cell font-bold text-[#12372A]">
                  Recorded By
                </TableHead>
                <TableHead className="text-right font-bold text-[#12372A]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={undefined}>
            {dormers.map((dormer) => {
              const statusConfig = getStatusBadge(dormer.paymentStatus);
              const StatusIcon = statusConfig.icon;

              return (
                <TableRow className="hover:bg-[#f0f0f0] transition-colors" key={dormer.id}>
                  <TableCell className="font-medium w-[200px]">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border-2 border-[#A5D6A7] flex-shrink-0">
                        <AvatarFallback className="bg-[#A5D6A7] text-[#2E7D32] font-semibold">
                          {dormer.firstName[0]}
                          {dormer.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[#333333] max-w-[200px] truncate" title={`${dormer.firstName} ${dormer.lastName}`}>
                          {dormer.firstName} {dormer.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Room {dormer.roomNumber}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[130px]">
                    <div className="font-semibold text-[#333333]">
                      {formatCurrency(dormer.amountPaid)}
                    </div>

                    {dormer.paymentStatus === "Partial" && (
                      <div className="text-xs text-yellow-600">
                        Remaining:{" "}
                        {formatCurrency(eventAmount - dormer.amountPaid)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <Badge
                      variant={statusConfig.variant}
                      className={statusConfig.className}
                    >
                      <StatusIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{dormer.paymentStatus}</span>
                    </Badge>
                    {dormer.paymentMethod && (
                      <div className="text-xs text-gray-500 mt-1 truncate" title={`${dormer.paymentMethod[0].toUpperCase()}${dormer.paymentMethod.slice(1).toLowerCase()}`}>
                        {dormer.paymentMethod[0].toUpperCase()}
                        {dormer.paymentMethod.slice(1).toLowerCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell w-[150px]">
                    {dormer.paymentDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-[#333333] truncate">
                          {formatDate(dormer.paymentDate)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Not paid</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell w-[200px]">
                    {dormer.recordedBy ? (
                      <div>
                        <div className="text-sm font-medium text-[#333333] max-w-[200px] truncate" title={dormer.recordedBy.name}>
                          {dormer.recordedBy.name}
                        </div>
                        <div className="text-xs text-gray-500 max-w-[200px] truncate" title={dormer.recordedBy.email}>
                          {dormer.recordedBy.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right w-[160px]">
                    {dormer.paymentStatus != "Paid" ? (
                      <Button
                        size="sm"
                        onClick={() => onLogPayment(dormer)}
                        className="bg-[#2E7D32] hover:bg-[#A5D6A7] text-white font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                        variant={undefined}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Log Payment
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[#2E7D32] border-[#A5D6A7] bg-[#A5D6A7]/10 font-semibold whitespace-nowrap"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
