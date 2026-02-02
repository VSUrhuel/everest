"use client";

import { useEffect, useState } from "react";
import { useFinesData } from "./hooks/useFinesData";
import { useFinesActions } from "./hooks/useFinesAction";
import { useModal } from "./hooks/useModal";
import { BillFines, PaymentFines, PaymentFinesData, ImportedFine, MappedFine, DormerWithFines } from "./types";
import { onAuthStateChanged, User } from "firebase/auth";
import { FinesPageSkeleton } from "./components/FinesPageSkeleton";
import FinesContent from "./components/FinesContent";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { auth, firestore as db } from "@/lib/firebase";
import { toast } from "sonner";
import ImportResultModal from "./components/ImportResultModal";

export default function FinesPage() {
  const {
    fines,
    loading,
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
  } = useFinesData();

  const { saveFine, handleSavePayment, payAllFines, isSubmitting } = useFinesActions();

  const {
    modal,
    selectedDormer: rawSelectedDormer,
    selectedFinePayment,
    openModal,
    closeModal,
  } = useModal();

  // Cast selectedDormer to the extended type expected by FinesModal
  const selectedDormer = rawSelectedDormer as DormerWithFines | null;

  const [user, setUser] = useState<User | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportResultModal, setShowImportResultModal] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, errors: [] });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (loading || !summary) {
    return <FinesPageSkeleton />;
  }

  const handleImportAttendance = async (fines: ImportedFine[]) => {
    setIsImporting(true);
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // check if these are parsing errors from the modal
      const parsingErrors = fines.filter(fine => fine.isParsingError);
      if (parsingErrors.length > 0) {
        parsingErrors.forEach(errorObj => {
          errors.push(errorObj.error);
          errorCount++;
        });
        return { successCount, errorCount, errors };
      }

      const mappedFines: MappedFine[] = [];
      const validationErrors: { [key: string]: string } = {}; // Track validation errors per student

      // group fines by unique student (email + name combination)
      const finesByStudent: { [key: string]: ImportedFine[] } = {};
      fines.forEach((fine) => {
        const email = fine.email?.trim().toLowerCase();
        const firstName = fine.firstName?.trim().toLowerCase();
        const lastName = fine.lastName?.trim().toLowerCase();
        const studentKey = `${email}|${firstName}|${lastName}`;

        if (!finesByStudent[studentKey]) {
          finesByStudent[studentKey] = [];
        }
        finesByStudent[studentKey].push(fine);
      });

      // validate each unique student only once
      Object.entries(finesByStudent).forEach(([studentKey, studentFines]) => {
        const firstFine = studentFines[0];
        const rowNumber = firstFine.rowNumber || 1;
        const email = firstFine.email?.trim();
        const firstName = firstFine.firstName?.trim();
        const lastName = firstFine.lastName?.trim();
        const amount = firstFine.amount;
        const reason = firstFine.reason?.trim();

        // validate required fields (only for the first fine of each student)
        if (!email) {
          const errorMsg = `Row ${rowNumber}: Email is required.`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        if (!firstName) {
          const errorMsg = `Row ${rowNumber}: First name is required.`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        if (!lastName) {
          const errorMsg = `Row ${rowNumber}: Last name is required.`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        if (!amount || isNaN(amount) || amount <= 0) {
          const errorMsg = `Row ${rowNumber}: Invalid amount "${amount}". Must be a positive number.`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        if (!reason) {
          const errorMsg = `Row ${rowNumber}: Reason is required.`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        // basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          const errorMsg = `Row ${rowNumber}: Invalid email format "${email}".`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        console.log('Looking for dormer with email:', email, 'firstName:', firstName, 'lastName:', lastName);
        const dormer = dormers.find(d =>
          d.email.trim().toLowerCase() === email.toLowerCase() &&
          d.firstName.trim().toLowerCase() === firstName.toLowerCase() &&
          d.lastName.trim().toLowerCase() === lastName.toLowerCase()
        );

        if (dormer) {
          console.log('Found dormer:', dormer.id);
          // add all fines for this valid student
          studentFines.forEach(fine => {
            mappedFines.push({
              ...fine,
              dormerId: dormer.id,
              dormitoryId: dormer.dormitoryId,
              originalIndex: rowNumber,
            });
          });
        } else {
          // check if email exists but names don't match
          const emailMatch = dormers.find(d => d.email.trim().toLowerCase() === email.toLowerCase());
          if (emailMatch) {
            const errorMsg = `Row ${rowNumber}: Name mismatch. Found dormer with email "${email}" but name "${firstName} ${lastName}" doesn't match database record "${emailMatch.firstName} ${emailMatch.lastName}".`;
            validationErrors[studentKey] = errorMsg;
            errors.push(errorMsg);
          } else {
            const errorMsg = `Row ${rowNumber}: Dormer with email "${email}" not found in the system.`;
            validationErrors[studentKey] = errorMsg;
            errors.push(errorMsg);
          }
          errorCount++;
        }
      });

      console.log('Mapped fines to create:', mappedFines);
      for (const fine of mappedFines) {
        try {
          const fineData = {
            totalAmountDue: fine.amount,
            dormerId: fine.dormerId,
            finesRemarks: fine.reason,
            description: fine.reason,
            dormitoryId: fine.dormitoryId,
            fineId: fine.fineId,
          };

          // check for duplicate fines (same dormer, fine type ID, and date)
          const existingFinesQuery = query(
            collection(db, "finesPayment"),
            where("dormerId", "==", fine.dormerId),
            where("fineId", "==", fine.fineId),
            where("dateImposed", "==", fine.dateImposed)
          );

          const existingFinesSnapshot = await getDocs(existingFinesQuery);
          if (!existingFinesSnapshot.empty) {
            errors.push(`Row ${fine.originalIndex}: Fine already exists for ${fine.firstName} ${fine.lastName} with reason "${fine.reason}" on ${fine.dateImposed.toDateString()}.`);
            errorCount++;
            continue;
          }

          await addDoc(collection(db, "finesPayment"), {
            ...fineData,
            status: "Unpaid",
            remainingBalance: fineData.totalAmountDue,
            amountPaid: 0,
            createdAt: serverTimestamp(),
            paymentDate: null,
            dateImposed: fine.dateImposed,
            recordedBy: user?.uid
          });
          console.log('Fine created for:', fine.dormerId);
          successCount++;
        } catch (error) {
          console.error('Error creating fine:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
          errors.push(`Row ${fine.originalIndex}: Failed to create fine for ${fine.email} - ${errorMessage}`);
          errorCount++;
        }
      }
    } finally {
      setIsImporting(false);
    }

    return { successCount, errorCount, errors };
  };

  return (
    <>
      <FinesContent
        fines={fines}
        summary={summary}
        paginatedDormers={paginatedDormers}
        payableFines={payableFines}
        totalPages={totalPages}
        currentPage={currentPage}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        handleNextPage={handleNextPage}
        handlePreviousPage={handlePreviousPage}
        dormers={dormers}
        isSubmitting={isSubmitting}
        isImporting={isImporting}
        user={user}
        modal={modal}
        selectedDormer={selectedDormer}
        selectedFinePayment={selectedFinePayment}
        openModal={openModal}
        closeModal={closeModal}
        saveFine={saveFine}
        handleSavePayment={handleSavePayment}
        payAllFines={payAllFines}
        onImportAttendance={async (fines) => {
          const results = await handleImportAttendance(fines);
          setImportResults({ success: results.successCount, failed: results.errorCount, errors: results.errors });
          setShowImportResultModal(true);
          return results;
        }}
      />
      <ImportResultModal
        isOpen={showImportResultModal}
        onClose={() => setShowImportResultModal(false)}
        errors={importResults.errors}
        successCount={importResults.success}
        errorCount={importResults.failed}
      />
    </>
  );
}
