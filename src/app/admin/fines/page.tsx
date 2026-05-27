"use client";

import { useEffect, useState } from "react";
import { useFinesData } from "./hooks/useFinesData";
import { useFinesActions } from "./hooks/useFinesAction";
import { useModal } from "./hooks/useModal";
import { BillFines, PaymentFines, PaymentFinesData, ImportedFine, MappedFine, DormerWithFines } from "./types";
import { onAuthStateChanged, User } from "firebase/auth";
import { FinesPageSkeleton } from "./components/FinesPageSkeleton";
import FinesContent from "./components/FinesContent";
import { collection, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, doc } from "firebase/firestore";
import { auth, firestore as db } from "@/lib/firebase";
import { toast } from "sonner";
import ImportResultModal from "./components/ImportResultModal";
import { sendEmail } from "@/app/utils/sendEmail";
import { newFineImposedTemplate } from "./email-templates/newFineImposed";
import { roomFineImposedTemplate } from "./email-templates/roomFineImposed";
import { ProgressModal } from "@/components/ui/progress-modal";

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
    sortFilter,
    setSortFilter,
    handleNextPage,
    handlePreviousPage,
    dormers,
    dormersWithFines,
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
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[]; emailsSent: number; emailsFailed: number }>({ success: 0, failed: 0, errors: [], emailsSent: 0, emailsFailed: 0 });
  type ImportProgress = { title: string; message: string; progress: number; total: number };
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

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
    let emailsSent = 0;
    let emailsFailed = 0;

    try {
      // check if these are parsing errors from the modal
      const parsingErrors = fines.filter(fine => fine.isParsingError);
      if (parsingErrors.length > 0) {
        parsingErrors.forEach(errorObj => {
          errors.push(errorObj.error);
          errorCount++;
        });
        return { successCount, errorCount, errors, emailsSent, emailsFailed };
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

        //console.log('Looking for dormer with email:', email, 'firstName:', firstName, 'lastName:', lastName);
        const dormer = dormers.find(d =>
          d.email.trim().toLowerCase() === email.toLowerCase() &&
          d.firstName.trim().toLowerCase() === firstName.toLowerCase() &&
          d.lastName.trim().toLowerCase() === lastName.toLowerCase()
        );

        if (dormer) {
          //console.log('Found dormer:', dormer.id);
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

      // Normalize a date to UTC midnight so duplicate detection is stable
      // even if CSV parsing drifts by ms/timezone. Keying by epoch-ms of UTC
      // midnight gives us a deterministic equality check.
      const toDayKey = (d: Date | Timestamp): { ts: Timestamp; ms: number } => {
        const date = d instanceof Timestamp ? d.toDate() : d;
        const ms = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        return { ts: Timestamp.fromDate(new Date(ms)), ms };
      };

      // Pre-fetch existing fines for all imported dormers in batches
      // (Firestore 'in' supports max 30 values). This replaces an N+1 query
      // pattern that previously ran one getDocs per fine.
      const dormerIds = Array.from(new Set(mappedFines.map((f) => f.dormerId)));
      const existingKey = new Set<string>();
      const IN_CHUNK = 30;
      setImportProgress({ title: "Checking for duplicates", message: "Looking up existing fines…", progress: 0, total: dormerIds.length });
      for (let i = 0; i < dormerIds.length; i += IN_CHUNK) {
        const chunk = dormerIds.slice(i, i + IN_CHUNK);
        const snap = await getDocs(
          query(collection(db, "finesPayment"), where("dormerId", "in", chunk)),
        );
        snap.forEach((d) => {
          const data = d.data();
          if (!data.dormerId || !data.fineId || !data.dateImposed) return;
          const raw =
            data.dateImposed instanceof Timestamp
              ? data.dateImposed
              : Timestamp.fromDate(new Date(data.dateImposed));
          const { ms } = toDayKey(raw);
          existingKey.add(`${data.dormerId}|${data.fineId}|${ms}`);
        });
        setImportProgress((p) => (p ? { ...p, progress: Math.min(i + chunk.length, dormerIds.length) } : p));
      }

      type FineOp = {
        ref: ReturnType<typeof doc>;
        data: Record<string, any>;
        meta: {
          rowNumber: number;
          dormerId: string;
          firstName: string;
          lastName: string;
          reason: string;
          amount: number;
          dateImposed: Date;
        };
      };

      const ops: FineOp[] = [];

      for (const fine of mappedFines) {
        const { ts: dateTs, ms: dateMs } = toDayKey(fine.dateImposed);
        const dupKey = `${fine.dormerId}|${fine.fineId}|${dateMs}`;

        if (existingKey.has(dupKey)) {
          errors.push(`Row ${fine.originalIndex}: Fine already exists for ${fine.firstName} ${fine.lastName} with reason "${fine.reason}" on ${fine.dateImposed.toDateString()}.`);
          errorCount++;
          continue;
        }

        ops.push({
          ref: doc(collection(db, "finesPayment")),
          data: {
            totalAmountDue: fine.amount,
            dormerId: fine.dormerId,
            finesRemarks: fine.reason,
            description: fine.reason,
            dormitoryId: fine.dormitoryId,
            fineId: fine.fineId,
            status: "Unpaid",
            remainingBalance: fine.amount,
            amountPaid: 0,
            createdAt: serverTimestamp(),
            paymentDate: null,
            dateImposed: dateTs,
            imposedBy: user?.email || user?.uid,
          },
          meta: {
            rowNumber: fine.originalIndex,
            dormerId: fine.dormerId,
            firstName: fine.firstName,
            lastName: fine.lastName,
            reason: fine.reason,
            amount: fine.amount,
            dateImposed: fine.dateImposed,
          },
        });
        existingKey.add(dupKey);
      }

      const BATCH_LIMIT = 500;
      const committed: FineOp[] = [];
      setImportProgress({ title: "Saving fines", message: "Writing to the database…", progress: 0, total: ops.length });
      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const chunk = ops.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const op of chunk) batch.set(op.ref, op.data);
        try {
          await batch.commit();
          committed.push(...chunk);
          successCount += chunk.length;
        } catch (err) {
          console.error('Bulk fine batch commit failed:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
          for (const op of chunk) {
            errors.push(`Row ${op.meta.rowNumber}: Failed to create fine for ${op.meta.firstName} ${op.meta.lastName} - ${errorMessage}`);
            errorCount++;
          }
        }
        setImportProgress((p) => (p ? { ...p, progress: Math.min(i + chunk.length, ops.length) } : p));
      }

      // Group committed fines by dormer so each dormer gets one summary email
      const byDormer = new Map<string, FineOp[]>();
      for (const op of committed) {
        const list = byDormer.get(op.meta.dormerId) ?? [];
        list.push(op);
        byDormer.set(op.meta.dormerId, list);
      }

      const dormerEntries = Array.from(byDormer.entries());
      setImportProgress({ title: "Sending notifications", message: "Emailing dormers…", progress: 0, total: dormerEntries.length });
      const EMAIL_CONCURRENCY = 5;
      let emailsDone = 0;
      let nextIndex = 0;
      const worker = async () => {
        while (true) {
          const i = nextIndex++;
          if (i >= dormerEntries.length) break;
          const [dormerId, group] = dormerEntries[i];
          try {
            const dormer = dormers.find((d) => d.id === dormerId);
            let result: { ok: boolean; error?: string };
            if (!dormer?.email) {
              result = { ok: false, error: "no dormer email" };
            } else {
              result = await sendEmail(
                {
                  to: dormer.email,
                  subject: `New Fine${group.length > 1 ? "s" : ""} Imposed`,
                  html: newFineImposedTemplate(
                    dormer.firstName,
                    group.map((g) => ({
                      finesRemarks: g.meta.reason,
                      totalAmountDue: g.meta.amount,
                      dateImposed: g.meta.dateImposed,
                    })),
                  ),
                },
                { silent: true },
              );
            }
            if (result.ok) emailsSent++;
            else emailsFailed++;
          } catch {
            emailsFailed++;
          } finally {
            emailsDone++;
            setImportProgress((p) => (p ? { ...p, progress: emailsDone } : p));
          }
        }
      };
      const workerCount = Math.min(EMAIL_CONCURRENCY, dormerEntries.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
      if (emailsFailed > 0) {
        toast.warning(`Fines saved. ${emailsSent} email(s) sent, ${emailsFailed} failed.`);
      } else if (emailsSent > 0) {
        toast.success(`Fines saved. ${emailsSent} email(s) sent.`);
      }
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }

    return { successCount, errorCount, errors, emailsSent, emailsFailed };
  };

  const handleApplyRoomFine = async (roomNumber: string, amount: number, reason: string) => {
    try {
      // Get all dormers in the specified room (exclude soft-deleted)
      const isSoftDeleted = (d: any) => {
        const raw = d.isDeleted;
        return raw === true || raw === "true" || raw === 1 || Boolean(d.deletedAt);
      };
      const dormersInRoom = dormers.filter(
        (d) => d.roomNumber === roomNumber && !isSoftDeleted(d),
      );

      if (dormersInRoom.length === 0) {
        toast.error(`No active dormers found in Room ${roomNumber}`);
        return;
      }

      toast.loading(`Applying fine to ${dormersInRoom.length} residents in Room ${roomNumber}...`);

      // generate a unique ID for this room fine to link all individual fines
      const roomFineId = `room_${roomNumber}_${Date.now()}`;
      const dateImposed = new Date();

      let successCount = 0;
      let errorCount = 0;
      const savedDormers: typeof dormersInRoom = [];

      for (const dormer of dormersInRoom) {
        try {
          const fineData: BillFines = {
            totalAmountDue: amount,
            finesRemarks: `Room ${roomNumber}: ${reason}`,
            dormerId: dormer.id,
            dormitoryId: dormer.dormitoryId,
            dateImposed,
            roomFineId, // Link all fines with this shared ID
            roomNumber,
          };

          await saveFine(fineData, user);
          savedDormers.push(dormer);
          successCount++;
        } catch (error) {
          console.error(`Error applying fine to ${dormer.firstName} ${dormer.lastName}:`, error);
          errorCount++;
        }
      }

      toast.dismiss();

      // BCC blast: one shared email to every resident whose fine was successfully saved
      let emailsSent = 0;
      let emailsFailed = 0;
      const recipientEmails = savedDormers.map((d) => d.email).filter(Boolean);
      const uniqueRecipients = Array.from(new Set(recipientEmails));
      if (uniqueRecipients.length > 0) {
        const result = await sendEmail(
          {
            to: uniqueRecipients.join(", "),
            subject: `Shared Room Fine for Room ${roomNumber}`,
            html: roomFineImposedTemplate(
              roomNumber,
              amount,
              reason,
              dateImposed,
              savedDormers.length,
            ),
          },
          { silent: true },
        );
        if (result.ok) emailsSent = uniqueRecipients.length;
        else emailsFailed = uniqueRecipients.length;
      }

      if (errorCount === 0 && emailsFailed === 0) {
        toast.success(
          `Successfully applied shared ₱${amount.toFixed(2)} room fine to all ${successCount} residents in Room ${roomNumber}${emailsSent > 0 ? ` — notified ${emailsSent} resident(s) by email.` : "."}`,
        );
      } else if (errorCount === 0 && emailsFailed > 0) {
        toast.warning(
          `Fine applied to ${successCount} residents but the notification email failed to send.`,
        );
      } else {
        toast.warning(
          `Applied fine to ${successCount} residents. ${errorCount} failed.${emailsSent > 0 ? ` ${emailsSent} email(s) sent.` : ""}`,
        );
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to apply room fine");
      console.error("Room fine error:", error);
    }
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
        sortFilter={sortFilter}
        setSortFilter={setSortFilter}
        handleNextPage={handleNextPage}
        handlePreviousPage={handlePreviousPage}
        dormers={dormers}
        dormersWithFines={dormersWithFines}
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
          setImportResults({
            success: results.successCount,
            failed: results.errorCount,
            errors: results.errors,
            emailsSent: results.emailsSent ?? 0,
            emailsFailed: results.emailsFailed ?? 0,
          });
          setShowImportResultModal(true);
          return results;
        }}
        onApplyRoomFine={handleApplyRoomFine}
      />
      <ImportResultModal
        isOpen={showImportResultModal}
        onClose={() => setShowImportResultModal(false)}
        errors={importResults.errors}
        successCount={importResults.success}
        errorCount={importResults.failed}
        emailsSent={importResults.emailsSent}
        emailsFailed={importResults.emailsFailed}
      />
      <ProgressModal
        isOpen={importProgress !== null}
        title={importProgress?.title}
        message={importProgress?.message}
        progress={importProgress?.progress}
        total={importProgress?.total}
      />
    </>
  );
}
