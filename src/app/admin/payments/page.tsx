"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, firestore as db } from "@/lib/firebase";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Button } from "@/components/ui/button";
import PaymentsTable from "./components/PaymentsTable";
import PaymentDetailsModal from "./components/ListOfPaymentsModal";
import PaymentModal from "../dormers/components/PaymentModal";
import PaymentHeader from "./components/PaymentHeader";
import SummaryCards from "./components/SummaryCards";
import PaymentsFilter from "./components/PaymentsFilter";
import { PaymentsPageSkeleton } from "./components/PaymentsPageSkeleton";
import { usePaymentsData } from "./hooks/usePaymentsData";
import { usePaymentActions } from "./hooks/usePaymentActions";
import { BillData } from "./types";
import { Dormer } from "../dormers/types";
import { handleExport } from "./utils/csvExport";

export default function PaymentsContent() {
  const [user, setUser] = useState<User | null>(null);
  const { ConfirmDialog, confirm } = useConfirmDialog();
  
  const {
    loading,
    paginatedBills,
    uniqueBillingPeriods,
    filteredBills,
    combinedBillData,
    summaryStats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    billingPeriodFilter,
    setBillingPeriodFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    handleNextPage,
    handlePreviousPage,
    dormitoryId,
  } = usePaymentsData();

  const { handleRecordPayment } = usePaymentActions(
    paginatedBills.map((b) => b.dormer),
    dormitoryId
  );

  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Keep selectedBill in sync with live data so the details modal
  // always reflects the latest payments after a new payment is recorded.
  useEffect(() => {
    if (!selectedBill) return;
    const updated = combinedBillData.find((b) => b.id === selectedBill.id);
    if (updated) setSelectedBill(updated);
  }, [combinedBillData]);

  const handleViewDetails = (bill: BillData) => {
    setSelectedBill(bill);
    setIsModalOpen(true);
  };

  const openPaymentModalForBill = (bill: BillData) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  if (loading) {
    return <PaymentsPageSkeleton />;
  }

  const handleExportWithConfirm = async () => {
    const confirmed = await confirm({
      title: "Export Payments Data",
      description: `Are you sure you want to export all registered  dormers' payment data to CSV? This will download a file to your computer.`,
      confirmText: "Export",
      cancelText: "Cancel",
      variant: "default",
    });

    if (confirmed) {
      handleExport(filteredBills);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <ConfirmDialog />
      <PaymentHeader 
        onExport={handleExportWithConfirm}
      />

      <SummaryCards
        totalAmountDue={summaryStats.totalAmountDue}
        totalAmountPaid={summaryStats.totalAmountPaid}
        totalRemainingBalance={summaryStats.totalRemainingBalance}
      />

      <PaymentsFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        billingPeriodFilter={billingPeriodFilter}
        setBillingPeriodFilter={setBillingPeriodFilter}
        billingPeriods={uniqueBillingPeriods}
        paginatedBills={paginatedBills}
        filteredBills={filteredBills}
        setCurrentPage={setCurrentPage}
      />

      <PaymentsTable
        bills={paginatedBills}
        onViewDetails={handleViewDetails}
        onRecordPayment={openPaymentModalForBill}
      />

      <PaymentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bill={selectedBill}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        bill={selectedBill}
        dormer={selectedBill?.dormer as Dormer | null}
        onSavePayment={async (paymentData) => {
          await handleRecordPayment(paymentData, user);
          closePaymentModal();
        }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 sm:py-4">
        <span className="text-xs sm:text-sm text-gray-600 font-medium">
          Page {currentPage} of {totalPages || 1}
        </span>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex-1 sm:flex-none border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs sm:text-sm"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="flex-1 sm:flex-none border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs sm:text-sm"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
