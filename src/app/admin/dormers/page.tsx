"use client";

import { useState, useEffect } from "react";
import { useDormers } from "./hooks/useDormers";
import { useDormerActions } from "./hooks/useDormerActions";
import { useModal } from "./hooks/useModal";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

import DormerHeader from "./components/DormerHeader";
import DormerFilters from "./components/DormerFilters";
import DormersTable from "./components/DormersTable";
import AddDormerModal from "./components/AddDormerModal";
import BillsModal from "./components/BillsModal";
import PaymentModal from "./components/PaymentModal";
import GenerateBillModal from "./components/GenerateBillModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DormersPageSkeleton } from "./components/DormersPageSkeleton";
import { Bill, Payable } from "./types";
import { Delete } from "lucide-react";
import DeleteDormerModal from "./components/DeleteDormerModal";
import { handleExport } from "./utils/csvExport";
import { getBillingPeriodLabel } from "./utils/generateBillUtils";
import EditDormerModal from "./components/EditDormerModal";
import ImportDormerModal from "./components/ImportDormerModal";
import ImportResultModal from "./components/ImportErrorModals";
import ImportBillsModal from "./components/ImportBillsModal";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { toast } from "sonner";
import { createBill, updateBill, findExistingBill, isPaidBill } from "@/lib/admin/bill";

export default function DormersPage() {
  const [user, setUser] = useState<User | null>(null);
  const { ConfirmDialog, confirm } = useConfirmDialog();
  
  const {
    dormers,
    bills,
    payables,
    loading,
    paginatedDormers,
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
  } = useDormers();
 
  const {
    saveDormer,
    handleSavePayment,
    payAllBills,
    saveBill,
    deleteDormer,
    isSubmitting,
    updateDormer,
    importDormers,
    errors,
  } = useDormerActions(dormers, bills);

  const { modal, selectedDormer, selectedBill, openModal, closeModal } =
    useModal();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [billToCreate, setBillToCreate] = useState<Bill | null>(null);
  const [showImportErrorModal, setShowImportErrorModal] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const [isImportingBills, setIsImportingBills] = useState(false);
  const [billImportResults, setBillImportResults] = useState({ success: 0, failed: 0, errors: [] as string[] });
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkDuplicates, setBulkDuplicates] = useState<{ bill: any; existingId: string }[]>([]);
  const [bulkNewBills, setBulkNewBills] = useState<any[]>([]);
  const [bulkPayable, setBulkPayable] = useState<Payable | null>(null);
  const [showBillImportResultModal, setShowBillImportResultModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <DormersPageSkeleton />;
  }

  const handleConfirmBulkOverwrite = async () => {
    setShowBulkConfirmDialog(false);
    setIsImportingBills(true);
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // Update existing bills with new payable data
      for (const { bill, existingId } of bulkDuplicates) {
        try {
          const billData = {
            id: existingId,
            totalAmountDue: bulkPayable!.amount,
            dormerId: bill.dormerId,
            dormitoryId: bill.dormitoryId,
            description: bulkPayable!.name,
            payableId: bulkPayable!.id,
            billingPeriod: bill.billingPeriod,
            amountPaid: 0,
            status: "Unpaid" as const,
          };
          await updateBill(billData as any, user!);
          successCount++;
        } catch (error) {
          console.error(`Error updating bill for row ${bill.rowNumber}:`, error);
          errors.push(`Row ${bill.rowNumber}: Failed to update bill for ${bill.firstName} ${bill.lastName}.`);
          errorCount++;
        }
      }

      // Create new bills
      for (const bill of bulkNewBills) {
        try {
          const billData = {
            totalAmountDue: bulkPayable!.amount,
            dormerId: bill.dormerId,
            dormitoryId: bill.dormitoryId,
            description: bulkPayable!.name,
            payableId: bulkPayable!.id,
            billingPeriod: bill.billingPeriod,
            amountPaid: 0,
            remainingBalance: bulkPayable!.amount,
            billDate: new Date(),
            updatedAt: serverTimestamp(),
            dormer: dormers.find(d => d.id === bill.dormerId) || null,
            status: "Unpaid" as const,
          };
          await createBill(billData, user!, bill.dormitoryId);
          successCount++;
        } catch (error) {
          console.error(`Error creating bill for row ${bill.rowNumber}:`, error);
          errors.push(`Row ${bill.rowNumber}: Failed to create bill for ${bill.firstName} ${bill.lastName}.`);
          errorCount++;
        }
      }
      setBillImportResults({ success: successCount, failed: errorCount, errors });
      setShowBillImportResultModal(true);
    } catch (error) {
      console.error("Error in bulk bill import:", error);
      toast.error("An unexpected error occurred while importing bills.");
    } finally {
      setIsImportingBills(false);
    }
  };

  const handleExportWithConfirm = async () => {
    const confirmed = await confirm({
      title: "Export Dormers Data",
      description: `Are you sure you want to export all registered dormers' data to CSV? This will download a file to your computer.`,
      confirmText: "Export",
      cancelText: "Cancel",
      variant: "default",
    });

    if (confirmed) {
      handleExport(dormers);
    }
  };

  const handleImportBills = async (billsData: any[], payable: Payable | null, user: User) => {
    setIsImportingBills(true);
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const parsingErrors = billsData.filter(bill => bill.isParsingError);
      if (parsingErrors.length > 0) {
        parsingErrors.forEach(errorObj => {
          errors.push(errorObj.error);
          errorCount++;
        });
        return { successCount, errorCount, errors };
      }

      if (!payable) {
        errors.push("No payable type selected.");
        return { successCount: 0, errorCount: 1, errors };
      }

      interface MappedBill {
        email: string;
        firstName: string;
        lastName: string;
        billingPeriod: string;
        rowNumber: number;
        dormerId: string;
        dormitoryId: string;
      }

      const mappedBills: MappedBill[] = [];
      const validationErrors: { [key: string]: string } = {};

      const dormersData = dormers;

      const billsByStudent: { [key: string]: any[] } = {};
      billsData.forEach((bill) => {
        const email = bill.email?.trim().toLowerCase();
        const firstName = bill.firstName?.trim().toLowerCase();
        const lastName = bill.lastName?.trim().toLowerCase();
        const studentKey = `${email}|${firstName}|${lastName}`;

        if (!billsByStudent[studentKey]) {
          billsByStudent[studentKey] = [];
        }
        billsByStudent[studentKey].push(bill);
      });

      Object.entries(billsByStudent).forEach(([studentKey, studentBills]) => {
        const firstBill = studentBills[0];
        const rowNumber = firstBill.rowNumber || 1;
        const email = firstBill.email?.trim();
        const firstName = firstBill.firstName?.trim();
        const lastName = firstBill.lastName?.trim();

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

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          const errorMsg = `Row ${rowNumber}: Invalid email format for ${firstName} ${lastName}.`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        const matchingDormer = dormersData.find(
          (d) =>
            d.email.toLowerCase() === email.toLowerCase() &&
            d.firstName.toLowerCase() === firstName.toLowerCase() &&
            d.lastName.toLowerCase() === lastName.toLowerCase()
        );

        if (!matchingDormer) {
          const errorMsg = `Row ${rowNumber}: No matching dormer found for ${firstName} ${lastName} (${email}).`;
          validationErrors[studentKey] = errorMsg;
          errors.push(errorMsg);
          errorCount++;
          return;
        }

        studentBills.forEach((bill) => {
          if (!validationErrors[studentKey]) {
            mappedBills.push({
              email: bill.email,
              firstName: bill.firstName,
              lastName: bill.lastName,
              billingPeriod: bill.billingPeriod,
              rowNumber: bill.rowNumber,
              dormerId: matchingDormer.id,
              dormitoryId: matchingDormer.dormitoryId,
            });
          }
        });
      });

      const newBills: MappedBill[] = [];
      const duplicates: { bill: MappedBill; existingId: string }[] = [];

      console.log('[BulkImport] Checking bills for duplicates. Total mapped bills:', mappedBills.length);

      // Check each bill for duplicates using the centralized helper function
      // This logic matches GenerateBillModal for consistency
      for (const bill of mappedBills) {
        // First check if the bill is already paid/partially paid - cannot overwrite these
        const isPaid = await isPaidBill(
          bill.dormerId,
          bill.billingPeriod,
          payable.id
        );

        if (isPaid) {
          console.log(`[BulkImport] Row ${bill.rowNumber}: Bill already paid for ${bill.firstName} ${bill.lastName}, skipping`);
          errors.push(`Row ${bill.rowNumber}: Bill for ${bill.firstName} ${bill.lastName} is already paid or partially paid and cannot be overwritten.`);
          errorCount++;
          continue;
        }

        // Then check if bill exists (unpaid) - these can be overwritten
        const existingBillId = await findExistingBill(
          bill.dormerId,
          bill.billingPeriod,
          payable.id
        );

        if (existingBillId) {
          console.log(`[BulkImport] Row ${bill.rowNumber}: Found duplicate unpaid bill ${existingBillId} for ${bill.firstName} ${bill.lastName}`);
          duplicates.push({ bill, existingId: existingBillId });
        } else {
          console.log(`[BulkImport] Row ${bill.rowNumber}: No duplicate found, will create new bill`);
          newBills.push(bill);
        }
      }

      console.log('[BulkImport] Summary:', { newBills: newBills.length, duplicates: duplicates.length, skippedPaid: errorCount });

      if (duplicates.length > 0) {
        setShowBulkConfirmDialog(true);
        setBulkDuplicates(duplicates);
        setBulkNewBills(newBills);
        setBulkPayable(payable);
        return { successCount: 0, errorCount: 0, errors: [], pending: true };
      }

      // No duplicates - create all bills directly
      for (const bill of newBills) {
        try {
          const billData = {
            totalAmountDue: payable.amount,
            dormerId: bill.dormerId,
            billingPeriod: bill.billingPeriod,
            status: "Unpaid" as const,   
            dormitoryId: bill.dormitoryId,
            description: payable.name,
            payableId: payable.id,
            amountPaid: 0,
            remainingBalance: payable.amount,
            billDate: new Date(),
            updatedAt: serverTimestamp(),
            dormer: null,
          };
          await createBill(billData, user, bill.dormitoryId);
          successCount++;
        } catch (error) {
          console.error(`Error creating bill for row ${bill.rowNumber}:`, error);
          errors.push(`Row ${bill.rowNumber}: Failed to create bill for ${bill.firstName} ${bill.lastName}.`);
          errorCount++;
        }
      }

      return { successCount, errorCount, errors };
    } catch (error) {
      console.error("Error importing bills:", error);
      toast.error("An unexpected error occurred while importing bills.");
      return { successCount, errorCount, errors };
    } finally {
      setIsImportingBills(false);
    }
  };

  function handleCloseImportModal(): void {
    closeModal();
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <ConfirmDialog />
      <DormerHeader
        onAddDormer={() => openModal("add")}
        onImport={() => openModal("import")}
        onImportBills={() => openModal("importBills")}
        onExport={handleExportWithConfirm}
      />

      <DormerFilters
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortFilter={sortFilter}
        onSortChange={setSortFilter}
        count={paginatedDormers.length}
        resetFilter={() => {
          setSearchTerm("");
          setStatusFilter("All");
          setSortFilter("Descending");
        }}
      />

      <DormersTable
        dormers={paginatedDormers}
        onGenerateBill={(dormer) => openModal("generateBill", dormer)}
        onViewBills={(dormer) => openModal("bills", dormer)}
        onDelete={(dormer) => openModal("deleteDormer", dormer)}
        onEdit={(dormer) => openModal("edit", dormer)}
        hasFilters={searchTerm !== "" || statusFilter !== "All"}
        onResetFilters={() => {
          setSearchTerm("");
          setStatusFilter("All");
        }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 sm:py-4">
        <span className="text-xs sm:text-sm text-gray-600 font-medium">
          Page {currentPage} of {totalPages}
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

      <AddDormerModal
        isOpen={modal === "add"}
        onClose={closeModal}
        onSave={(dormerData) => saveDormer(dormerData, user)}
      />

      <ImportDormerModal
        isOpen={modal === "import"}
        onClose={handleCloseImportModal}
        onImport={async (dormersList) => {
          const results = await importDormers(dormersList, user);
          if (results) {
            setImportResults({ success: results.successCount, failed: results.errorCount });
            setShowImportErrorModal(true);
          }
        }}
        isSubmitting={isSubmitting}
      />

      <EditDormerModal
        isOpen={modal === "edit"}
        onClose={closeModal}
        onUpdate={(dormerData) => updateDormer(dormerData, user)}
        dormerData={selectedDormer}
      />

      <BillsModal
        isOpen={modal === "bills"}
        onClose={closeModal}
        dormer={selectedDormer}
        onRecordPayment={(bill: Bill) =>
          openModal("payment", selectedDormer, bill)
        }
        onPayAll={async () => {
          const unpaid = (selectedDormer?.bills ?? []).filter(
            (b) => b.status === "Unpaid" || b.status === "Partially Paid" || b.status === "Overdue"
          );
          await payAllBills(unpaid, user, selectedDormer);
        }}
        payables={payables}
      />

      <PaymentModal
        isOpen={modal === "payment"}
        onClose={closeModal}
        dormer={selectedDormer}
        bill={selectedBill}
        onSavePayment={async (paymentData) => {
          await handleSavePayment(paymentData, user);
          closeModal();
        }}
      />

      <ImportResultModal
        isOpen={showImportErrorModal}
        onClose={() => setShowImportErrorModal(false)}
        errors={errors}
        successCount={importResults.success}
        errorCount={importResults.failed}
      />

      <ImportBillsModal
        isOpen={modal === "importBills"}
        onClose={closeModal}
        onImport={async (bills, payable) => {
          const results = await handleImportBills(bills, payable, user);
          if (!results.pending) {
            setBillImportResults({ success: results.successCount, failed: results.errorCount, errors: results.errors });
            setShowBillImportResultModal(true);
          }
          return results;
        }}
        isSubmitting={isImportingBills}
        payables={payables}
      />

      <ImportResultModal
        isOpen={showBillImportResultModal}
        onClose={() => setShowBillImportResultModal(false)}
        errors={billImportResults.errors}
        successCount={billImportResults.success}
        errorCount={billImportResults.failed}
      />

      <DeleteDormerModal
        isOpen={modal === "deleteDormer"}
        onClose={closeModal}
        dormer={selectedDormer}
        onConfirm={async (dormerId) => {
          await deleteDormer(dormerId);
        }}
      />

      <GenerateBillModal
        isOpen={modal === "generateBill"}
        onClose={closeModal}
        dormer={selectedDormer}
        onGenerateBill={(billData) => saveBill(billData, user)}
        payables={payables}
        bills={bills}
        setShowConfirmDialog={setShowConfirmDialog}
        setBillToCreate={setBillToCreate}
        setShowErrorModal={setShowErrorModal}
      />

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-red-100 text-red-800">
          <DialogTitle className={undefined}>
            Overwrite Existing Bill?
          </DialogTitle>
          <DialogDescription className={undefined}>
            A bill for this dormer and billing period already exists. Do you
            want to overwrite it with the new data?
          </DialogDescription>
          <DialogFooter className={undefined}>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
              className={undefined}
              size={undefined}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => saveBill(billToCreate, user)}
              disabled={isSubmitting}
              variant={undefined}
              size={undefined}
            >
              {isSubmitting ? "Overwriting..." : "Overwrite Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showErrorModal}
        onOpenChange={setShowErrorModal}
        className="bg-red-100 text-red-800"
      >
        <DialogContent className={undefined}>
          <DialogTitle className={undefined}>Error</DialogTitle>
          <DialogDescription className={undefined}>
            An existing payment for this bill already exists. You cannot
            override or delete it.
          </DialogDescription>
          <DialogFooter className={undefined}>
            <Button
              onClick={() => setShowErrorModal(false)}
              className={undefined}
              variant={undefined}
              size={undefined}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkConfirmDialog} onOpenChange={setShowBulkConfirmDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogTitle className="text-red-600">
            Confirm Overwrite of Existing Bills
          </DialogTitle>
          <DialogDescription className="mb-4">
            The following bills already exist and will be overwritten with new data. This action cannot be undone.
          </DialogDescription>
          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table className={undefined}>
              <TableHeader className={undefined}>
                <TableRow className={undefined}>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead className={undefined}>Name</TableHead>
                  <TableHead className={undefined}>Email</TableHead>
                  <TableHead className={undefined}>Billing Period</TableHead>
                  <TableHead className={undefined}>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={undefined}>
                {bulkDuplicates.map(({ bill }) => (
                  <TableRow key={`${bill.email}-${bill.billingPeriod}`} className={undefined}>
                    <TableCell className="font-medium">{bill.rowNumber}</TableCell>
                    <TableCell className={undefined}>{bill.firstName} {bill.lastName}</TableCell>
                    <TableCell className="text-sm text-gray-600">{bill.email}</TableCell>
                    <TableCell className={undefined}>{getBillingPeriodLabel(bill.billingPeriod)}</TableCell>
                    <TableCell className={undefined}>{dormers.find(d => d.id === bill.dormerId)?.roomNumber || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowBulkConfirmDialog(false)}
              disabled={isImportingBills} className={undefined} size={undefined}            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmBulkOverwrite}
              disabled={isImportingBills} variant={undefined} size={undefined}            >
              {isImportingBills ? "Overwriting..." : "Overwrite Bills"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
