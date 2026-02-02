"use client";

import { useState } from "react";
import { BillFines, PaymentFines, PaymentFinesData } from "../types";
import { User } from "firebase/auth";
import FinesHeader from "./FinesHeader";
import FinesSummary from "./FinesSummary";
import ImportAttendanceModal from "./ImportAttendanceModal";
import DormerFilters from "../../dormers/components/DormerFilters";
import FinesTable from "./FinesTable";
import FinesPagination from "./FinesPagination";
import FinesModal from "./FinesModal";
import FinePaymentModal from "./FinePaymentModal";
import GenerateFinesModal from "./GenerateFinesModal";
import FinesErrorModal from "./FinesErrorModal";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface FinesContentProps {
  fines: PaymentFines[];
  summary: any;
  paginatedDormers: any[];
  payableFines: any[];
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  handleNextPage: () => void;
  handlePreviousPage: () => void;
  dormers: any[];
  isSubmitting: boolean;
  isImporting: boolean;
  user: User | null;
  modal: string;
  selectedDormer: any;
  selectedFinePayment: PaymentFinesData | null;
  openModal: (type: string, dormer?: any, fine?: PaymentFinesData) => void;
  closeModal: () => void;
  saveFine: (fineData: BillFines, user: User | null) => Promise<void>;
  handleSavePayment: (paymentData: any, user: User | null) => Promise<void>;
  payAllFines: (fines: PaymentFines[], user: User | null) => Promise<void>;
  onImportAttendance: (fines: any[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
}

export default function FinesContent({
  fines,
  summary,
  paginatedDormers,
  payableFines,
  totalPages,
  currentPage,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  handleNextPage,
  handlePreviousPage,
  dormers,
  isSubmitting,
  isImporting,
  user,
  modal,
  selectedDormer,
  selectedFinePayment,
  openModal,
  closeModal,
  saveFine,
  handleSavePayment,
  payAllFines,
  onImportAttendance,
}: FinesContentProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [fineToCreate, setFineToCreate] = useState<BillFines | null>(null);

  const { ConfirmDialog, confirm } = useConfirmDialog();

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <ConfirmDialog />

      <FinesHeader onImportAttendance={() => setIsImportModalOpen(true)} />

      <FinesSummary
        totalFines={summary?.totalFines}
        collectedFines={summary?.collectedFines}
        collectibleFines={summary?.collectibleFines}
      />

      <ImportAttendanceModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportAttendance}
        isSubmitting={isImporting}
        payableFines={payableFines}
      />

      <DormerFilters
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        count={paginatedDormers.length}
        resetFilter={() => {
          setSearchTerm("");
          setStatusFilter("All");
        }}
      />

      <FinesTable
        dormers={paginatedDormers}
        onGenerateFines={(dormer) => openModal("generateBill", dormer)}
        onViewFines={(dormer) => openModal("bills", dormer)}
        hasFilters={searchTerm !== "" || statusFilter !== "All"}
        onResetFilters={() => {
          setSearchTerm("");
          setStatusFilter("All");
        }}
      />

      <FinesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />

      <FinesModal
        isOpen={modal === "bills"}
        onClose={closeModal}
        dormer={selectedDormer}
        onRecordPayment={(fine: PaymentFinesData) =>
          openModal("payment", selectedDormer, fine)
        }
        onPayAll={() => payAllFines(selectedDormer?.fines.filter(f => f.status !== "Paid") || [], user)}
      />

      <FinePaymentModal
        isOpen={modal === "payment"}
        onClose={closeModal}
        dormer={selectedDormer}
        fine={selectedFinePayment}
        onSavePayment={async (paymentData) => {
          await handleSavePayment(paymentData, user);
          closeModal();
        }}
      />

      <GenerateFinesModal
        isOpen={modal === "generateBill"}
        onClose={closeModal}
        isSubmmitting={isSubmitting}
        dormer={selectedDormer}
        payables={payableFines}
        paymentFines={fines}
        onGenerateFine={async (fineData) => {
          await saveFine(fineData, user);
          closeModal();
        }}
        setFineToCreate={setFineToCreate}
        setShowErrorModal={setShowErrorModal}
      />

      <FinesErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  );
}