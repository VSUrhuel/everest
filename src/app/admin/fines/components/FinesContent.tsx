"use client";

import { useState } from "react";
import { BillFines, PaymentFines, PaymentFinesData } from "../types";
import { User } from "firebase/auth";
import { Dormer } from "../../dormers/types";
import FinesHeader from "./FinesHeader";
import FinesSummary from "./FinesSummary";
import ImportAttendanceModal from "./ImportAttendanceModal";
import ExportFinesModal from "./ExportFinesModal";
import RoomFineModal from "./RoomFineModal";
import DormerFilters from "../../dormers/components/DormerFilters";
import FinesTable from "./FinesTable";
import FinesPagination from "./FinesPagination";
import FinesModal from "./FinesModal";
import FinePaymentModal from "./FinePaymentModal";
import GenerateFinesModal from "./GenerateFinesModal";
import FinesErrorModal from "./FinesErrorModal";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { toast } from "sonner";
import { unpaidFinesReminderTemplate } from "../email-templates/unpaidFinesReminder";

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
  dormersWithFines: any[];
  isSubmitting: boolean;
  isImporting: boolean;
  user: User | null;
  modal: string;
  selectedDormer: any;
  selectedFinePayment: PaymentFinesData | null;
  openModal: (type: string, dormer?: any, fine?: PaymentFinesData) => void;
  closeModal: () => void;
  saveFine: (fineData: BillFines, user: User | null) => Promise<void>;
  handleSavePayment: (paymentData: any, user: User | null, dormer?: Dormer, recordedByDormer?: Dormer) => Promise<void>;
  payAllFines: (fines: PaymentFines[], user: User | null, dormersMap?: Map<string, Dormer>, recordedByDormer?: Dormer) => Promise<void>;
  onImportAttendance: (fines: any[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  onApplyRoomFine: (roomNumber: string, amount: number, reason: string) => Promise<void>;
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
  dormersWithFines,
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
  onApplyRoomFine,
}: FinesContentProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRoomFineModalOpen, setIsRoomFineModalOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [fineToCreate, setFineToCreate] = useState<BillFines | null>(null);

  const { ConfirmDialog, confirm } = useConfirmDialog();

  const handleSendEmailReminders = async () => {
    const confirmed = await confirm({
      title: "Send Email Reminders",
      description: "This will send email reminders to all dormers with unpaid fines. Are you sure you want to proceed?",
      confirmText: "Send Emails",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      // Get dormers with unpaid fines
      const dormersWithUnpaidFines = dormersWithFines.filter(dormer =>
        dormer.fines?.some((fine: PaymentFinesData) => fine.status === "Unpaid")
      );

      if (dormersWithUnpaidFines.length === 0) {
        toast.error("No dormers with unpaid fines found.");
        return;
      }

      // Send emails
      const emailPromises = dormersWithUnpaidFines.map(async (dormer) => {
        const unpaidFines = dormer.fines.filter((fine: PaymentFinesData) => fine.status === "Unpaid");
        const subject = "DormPay System - Unpaid Fines Reminder";
        const html = unpaidFinesReminderTemplate(
          {
            firstName: dormer.firstName,
            lastName: dormer.lastName
          },
          unpaidFines
        );

        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: dormer.email,
            subject,
            html,
            attachments: [],
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send email to ${dormer.email}`);
        }
      });

      await Promise.all(emailPromises);
      toast.success(`Email reminders sent to ${dormersWithUnpaidFines.length} dormer(s) with unpaid fines.`);
    } catch (error) {
      console.error("Error sending email reminders:", error);
      toast.error("Failed to send some email reminders. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <ConfirmDialog />

      <FinesHeader 
        onImportAttendance={() => setIsImportModalOpen(true)} 
        onExportCSV={() => setIsExportModalOpen(true)}
        onSendEmailReminders={handleSendEmailReminders}
        onRoomFine={() => setIsRoomFineModalOpen(true)}
      />

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

      <RoomFineModal
        isOpen={isRoomFineModalOpen}
        onClose={() => setIsRoomFineModalOpen(false)}
        onApply={onApplyRoomFine}
        dormers={dormers}
        isSubmitting={isSubmitting}
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
        onPayAll={() => {
          const dormersMap = new Map(dormers.map(d => [d.id, d]));
          const recordedByDormer = dormers.find(d => d.email === user?.email);
          payAllFines(selectedDormer?.fines.filter(f => f.status !== "Paid") || [], user, dormersMap, recordedByDormer);
        }}
      />

      <FinePaymentModal
        isOpen={modal === "payment"}
        onClose={closeModal}
        dormer={selectedDormer}
        fine={selectedFinePayment}
        onSavePayment={async (paymentData) => {
          const recordedByDormer = dormers.find(d => d.email === user?.email);
          await handleSavePayment(paymentData, user, selectedDormer, recordedByDormer);
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

      <ExportFinesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        payableFines={payableFines}
        fines={fines as unknown as PaymentFinesData[]}
        dormers={dormers}
      />
    </div>
  );
}