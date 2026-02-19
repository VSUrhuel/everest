"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, CalendarDays } from "lucide-react";
import { BillData } from "../types";

// --- Type Definitions ---
interface PaymentsFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  billingPeriodFilter: string;
  setBillingPeriodFilter: (value: string) => void;
  billingPeriods: string[];
  paginatedBills: BillData[];
  filteredBills: BillData[];
  setCurrentPage: (page: number) => void;
}

// --- Component ---
export default function PaymentsFilter({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  billingPeriodFilter,
  setBillingPeriodFilter,
  billingPeriods,
  paginatedBills,
  filteredBills,
  setCurrentPage,
}: PaymentsFilterProps) {
  return (
    <Card className="border-gray-200">
      <CardContent className="pt-2">
        <div className="flex flex-col md:flex-row gap-4 ">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by resident name, room, or period..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 text-sm sm:text-base border-gray-300"
                type={undefined}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-36">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="border-gray-300 w-full">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                <SelectItem value="All" className={undefined}>
                  All Statuses
                </SelectItem>
                <SelectItem value="Paid" className={undefined}>
                  Paid
                </SelectItem>
                <SelectItem value="Partially Paid" className={undefined}>
                  Partially Paid
                </SelectItem>
                <SelectItem value="Unpaid" className={undefined}>
                  Unpaid
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Billing Period Filter */}
          <div className="w-full md:w-36 ">
            <Select
              value={billingPeriodFilter}
              onValueChange={(value) => {
                setBillingPeriodFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="border-gray-300 w-full">
                <CalendarDays className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                <SelectItem value="All" className={undefined}>
                  All Periods
                </SelectItem>
                {billingPeriods?.filter(period => period && period.trim() !== '').map((period) => (
                  <SelectItem key={period} value={period} className={undefined}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm ||
            statusFilter !== "All" ||
            billingPeriodFilter !== "All") && (
            <div className="w-full md:w-auto">
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setBillingPeriodFilter("All");
                }}
                className="w-full mt-2 md:mt-0 bg-[#2E7D32] hover:bg-[#27632a] text-white"
                variant={undefined}
                size={undefined}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {paginatedBills.length} of {filteredBills.length} bills
        </div>
      </CardContent>
    </Card>
  );
}
