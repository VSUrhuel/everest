"use client";

import { useState, useEffect } from "react";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./../../components/ui/card";
import { Button } from "./../../components/ui/button";
import { Badge } from "./../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./../../components/ui/table";
import { Carousel } from "./../../components/ui/carousel";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  PlusIcon,
  Edit,
  FileDown,
  Mail,
} from "lucide-react";

import { firestore as db, auth } from "./../../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  where,
  updateDoc, // Use serverTimestamp for more accurate timestamps
} from "firebase/firestore";
import AddPayableModal from "./dormers/components/AddPayabaleModal";

import { onAuthStateChanged } from "firebase/auth";
import { Skeleton } from "./../../components/ui/skeleton";
import { toast } from "sonner";
import { formatAmount } from "./expenses/utils";
import { convertToHTMLTable, generateEmailHtml } from "@/lib/admin/dashboardUtils";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { FinesCards } from "./components/fines-cards";
import { useFinesData } from "./fines/hooks/useFinesData";
import { useFinesActions } from "./fines/hooks/useFinesAction";
import AddFineModal from "./components/add-fine-modal";

function SkeletonCard() {
  return (
    <Card className="border border-gray-100 dark:border-gray-800 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <Skeleton className="h-4 w-2/4" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

function PayableItem({ payable, onEdit }) {
  return (
    <div className="group relative rounded-xl border-2 border-gray-100 bg-gradient-to-br from-white to-[#A5D6A7]/5 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.98] sm:hover:scale-[1.02]">
      {/* accent bar */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#2E7D32] to-[#A5D6A7] rounded-l-xl"></div>

      <div className="flex items-start justify-between pl-2 sm:pl-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#A5D6A7]/30 flex-shrink-0">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2E7D32]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[#333333] group-hover:text-[#2E7D32] transition-colors truncate">
              {payable.name || "Untitled Payable"}
            </h3>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#2E7D32] mb-1.5 sm:mb-2 tracking-tight">
            ₱{payable.amount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
            {payable.description}
          </p>
        </div>

        {/* Edit button - always visible on mobile, hover on desktop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 sm:opacity-0 opacity-100 transition-all group-hover:opacity-100 hover:bg-[#2E7D32] hover:text-white active:bg-[#2E7D32] active:text-white -mt-1 -mr-1"
          onClick={() => onEdit(payable)}
          aria-label={`Edit ${payable.name}`}
        >
          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [payables, setPayables] = useState([]);
  const [user, setUser] = useState(null);
  const [showEditPayableModal, setShowEditPayableModal] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { ConfirmDialog, confirm } = useConfirmDialog();

  // State for raw data from Firestore
  const [expensesData, setExpensesData] = useState([]);
  const [dormersData, setDormersData] = useState([]);
  const [billsData, setBillsData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]); // Added state for payments
  const [loading, setLoading] = useState(true);

  // State for calculated dashboard values
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalCollectibles, setTotalCollectibles] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalDormers, setTotalDormers] = useState(0);

  const [recentTransactions, setRecentTransactions] = useState([]);

  const [payableToEdit, setPayableToEdit] = useState(null);

  const { dormitoryId, loading: dormitoryIdLoading} = useCurrentDormitoryId();

  // Fines Data
  const [fineToEdit, setFineToEdit] = useState(null);
  const [isAddFineModalOpen, setIsAddFineModalOpen] = useState(false);
  const [payablesPage, setPayablesPage] = useState(1);
  const payablesPerPage = 5;

  const {payableFines, loading: finesLoading} = useFinesData();
  const {addFine, updateFine, deleteFine} = useFinesActions();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // If no user is found, redirect to the login page
        window.location.href = "/";
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching all necessary data from Firestore in real-time
  useEffect(() => {
    setLoading(true);

    const collections = {
      expenses: setExpensesData,
      dormers: setDormersData,
      bills: setBillsData,
      payments: setPaymentsData, // Added payments collection listener
    };

    if (!dormitoryId) {
      return;
    }

    const unsubscribers = Object.entries(collections).map(
      ([collectionName, setter]) => {
        const q = query(collection(db, collectionName), where("dormitoryId", "==", dormitoryId));
        return onSnapshot(
          q,
          (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // If fetching dormers, filter by role 'User'
            if (collectionName === "dormers") {
              setter(data.filter((dormer) => dormer.role === "User" && !dormer.isDeleted));
            } else {
              setter(data);
            }
          },

          (error) => {
            console.error(`Error fetching ${collectionName}: `, error);
            toast.error(`Failed to load ${collectionName}.`); // ✨ Error toast
            setLoading(false); // Stop loading on error
          }
        );
      }
    );

    setLoading(false);

    // Cleanup function to unsubscribe from all listeners on component unmount
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [dormitoryId]);

  // Effect for calculating totals whenever the source data changes
  useEffect(() => {
    // 1. Calculate Total Expenses
    // Sums the 'expenseAmount' from all documents in the expensesData array.
    const expensesSum = expensesData.reduce(
      (total, expense) => total + parseFloat(expense.amount || 0),
      0
    );
    setTotalExpenses(expensesSum);

    // 2. Count Total Dormers
    // Simply gets the total number of items in the dormersData array.
    const dormerCount = dormersData.length;
    setTotalDormers(dormerCount);

    // 3. Calculate intermediate totals for funds and collectibles
    const totalAmountPaid = billsData.reduce(
      (total, bill) => total + (bill.amountPaid || 0),
      0
    );
    const totalAmountDue = billsData.reduce(
      (total, bill) => total + (bill.totalAmountDue || 0),
      0
    );

    // 4. Calculate Total Collectibles
    // The difference between the total amount due and the total amount paid.
    const collectibles = totalAmountDue - totalAmountPaid;
    setTotalCollectibles(collectibles);

    // 5. Calculate Total Fund Balance
    // The total money collected (total paid) minus the total sum of expenses.
    const funds = totalAmountPaid - expensesSum;
    setTotalFunds(funds);
  }, [expensesData, dormersData, billsData, paymentsData]); // Dependencies for recalculation

  useEffect(() => {
    setLoading(true);
    // Helper function to find dormer info safely
    const getDormerInfo = (dormerId) => {
      return dormersData.find((d) => d.id === dormerId) || {};
    };

    const getBillInfo = (billId) => {
      return billsData.find((b) => b.id === billId) || {};
    };

    // Format payments into a standardized transaction object
    const formattedPayments = paymentsData.map((payment) => {
      const dormer = getDormerInfo(payment.dormerId);
      const dormerName = `${dormer.firstName || "Unknown"} ${
        dormer.lastName || "Dormer"
      }`;
      return {
        id: payment.id,
        // Ensure date is a valid Date object; fall back to now if missing
        date: payment.createdAt?.toDate
          ? payment.createdAt.toDate()
          : new Date(),
        description: `Payment for ${
          getBillInfo(payment.billId).billingPeriod
        } paid through ${payment.paymentMethod} by ${dormerName} (Room ${
          dormer.roomNumber || "N/A"
        })`,
        amount: payment.amount,
        type: "payment",
      };
    });

    // Format expenses into a standardized transaction object
    const formattedExpenses = expensesData.map((expense) => {
      // Safely access recorder's name
      const recorderName =
        `${expense.recordedBy?.firstName || ""} ${
          expense.recordedBy?.lastName || ""
        }`.trim() || "Admin";
      return {
        id: expense.id,
        date: expense.expenseDate ? expense.expenseDate : new Date(),
        description: `${expense.category} expenses - ${expense.title}`,
        amount: expense.amount,
        type: "expense",
      };
    });
    // Combine, sort by date (most recent first), and take the top 5
    const allTransactions = [...formattedPayments, ...formattedExpenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    setRecentTransactions(allTransactions);
    setLoading(false);
  }, [paymentsData, expensesData, dormersData]); // This effect depends on these data arrays

  const kpiData = [
    {
      title: "Dorm Fund Balance",
      value: `₱${formatAmount(totalFunds || 0)}`,
      description: "Current available funds",
      icon: Wallet,
      trend: "up",
    },
    {
      title: "Total Collectibles",
      value: `₱${formatAmount(totalCollectibles || 0)}`,
      description: "Remaining collectibles",
      icon: TrendingUp,
      trend: "up",
    },
    {
      title: "Total Expenses",
      value: `₱${formatAmount(totalExpenses || 0)}`,
      description: "Overall expenses this semester",
      icon: TrendingDown,
      trend: "down",
    },
    {
      title: "Active Dormers",
      value: `${totalDormers}`,
      description: "Currently registered dormers",
      icon: Users,
      trend: "neutral",
    },
  ];

  // Swipe handlers
  const convertToCSV = (data) => {
    const header = [
      "Total Funds",
      "Total Collectibles",
      "Total Expenses",
      "Total Dormers",
    ];

    const rows = [
      totalFunds.toFixed(2),
      totalCollectibles.toFixed(2),
      totalExpenses.toFixed(2),
      totalDormers,
    ];

    return header.join(",") + "\n" + rows.join(",");
  };

 
  // Your updated function to send the report via email
  const handleEmailReport = async () => {
    const recipientEmails = dormersData
      .map((dormer) => dormer.email)
      .filter(Boolean);

    // If there are no valid recipients, stop here
    if (recipientEmails.length === 0) {
      toast.warn("No valid recipient emails found.");
      return;
    }

    const confirmed = await confirm({
      title: "Send Summary Report",
      description: `This will send an email containing the dormitory's financial summary report to all registered dormers. Proceed?`,
      confirmText: "Send Email",
      cancelText: "Cancel",
      variant: "default",
    });

    if (!confirmed) {
      return;
    }

    try {
      toast.info("Preparing to send summary report...");

      // Convert your KPI data directly to an HTML table string
      const reportTable = convertToHTMLTable(kpiData);

      // Modern and formal HTML email template
      const emailHtml = generateEmailHtml(reportTable);

      // The export sheet feature (`handleExportCSV`) is removed.
      // The email is now sent with the data embedded in the body.
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmails.join(", "),
          subject: "Dormitory Summary Report",
          html: emailHtml,
          // The 'attachments' key is completely removed
        }),
      });

      toast.success("Summary report has been emailed to all dormers!");
    } catch (error) {
      console.error("Failed to email report:", error);
      toast.error("There was a problem sending the summary report.");
    }
  };

  useEffect(() => {
    // Fetch data from API
    async function fetchPayables() {
      try {
        const queryPayable = query(collection(db, "regularCharge"), where("dormitoryId", "==", dormitoryId));
        const unsubscribe = onSnapshot(queryPayable, (snapshot) => {
          const payablesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPayables(payablesData);
        });
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching payables:", error);
      }
    }
    fetchPayables();
  }, [dormitoryId]);

  const handleAddPayable = () => {
    setPayableToEdit(null); // Clear any existing payable to edit
    setIsAddModalOpen(true); // Open the modal for adding a new payable
  };

  const handleEditPayable = (payable) => {
    setPayableToEdit(payable); // Set the payable to edit
    setIsAddModalOpen(true); // Open the modal for editing
  };

  const handleSaveFine = async (fineData) => {
    try {
      if (fineData.id) {
        await updateFine(fineData)
        toast.success("Fine Updated Successfully!");
      } else {
        await addFine(fineData)
        toast.success("New Fine Added Successfully!");
      }
      setIsAddFineModalOpen(false); // Close modal on success
    } catch (error) {
      console.error("Error saving fine:", error);
      toast.error("There was a problem saving the fine.");
    }
  };

  const handleSavePayable = async (payableData) => {
    try {
      if (payableData.id) {
        const docRef = doc(db, "regularCharge", payableData.id);
        await updateDoc(docRef, {
          ...payableData,
        });
        toast.success("Payable Updated Successfully!");
      } else {
        await addDoc(collection(db, "regularCharge"), {
          ...payableData,
          dormitoryId: dormitoryId,
        });
        toast.success("New Payable Added Successfully!");
      }
      setIsAddModalOpen(false); // Close modal on success
    } catch (error) {
      console.error("Error saving payable:", error);
      toast.error("Failed to save payable. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-1.5 sm:space-y-2">
          <Skeleton className="h-7 sm:h-8 w-48 sm:w-64" />
          <Skeleton className="h-3 sm:h-4 w-56 sm:w-72" />
        </div>

        {/* KPI Cards Skeleton - Mobile Carousel */}
        <div className="space-y-3">
          <Card className="shadow-md">
            <CardHeader className="pb-2 sm:pb-3">
              <Skeleton className="h-3 sm:h-4 w-28 sm:w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 mb-1.5 sm:mb-2" />
              <Skeleton className="h-3 w-32 sm:w-36" />
            </CardContent>
          </Card>
          {/* indicators skeleton */}
          <div className="flex justify-center gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-2 w-2 rounded-full" />
            ))}
          </div>
        </div>

        {/* Payables Section Skeleton */}
        <Card className="shadow-md">
          <CardHeader className="pb-3 sm:pb-4">
            <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 mb-1.5 sm:mb-2" />
            <Skeleton className="h-3 sm:h-4 w-40 sm:w-56" />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <Skeleton className="h-28 sm:h-32 w-full rounded-xl" />
            <Skeleton className="h-28 sm:h-32 w-full rounded-xl" />
            <Skeleton className="h-28 sm:h-32 w-full rounded-xl" />
          </CardContent>
        </Card>

        {/* Recent Transactions Skeleton */}
        <Card className="shadow-md">
          <CardHeader className="pb-3 sm:pb-4">
            <Skeleton className="h-5 sm:h-6 w-40 sm:w-48 mb-1 sm:mb-2" />
            <Skeleton className="h-3 w-48 sm:w-64" />
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="space-y-2 p-3 sm:p-4 border border-gray-100 rounded-lg"
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex-shrink-0" />
                  <Skeleton className="h-4 sm:h-5 flex-1" />
                  <Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
                </div>
                <div className="flex items-center gap-2 pl-11 sm:pl-[52px]">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <ConfirmDialog />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 sm:gap-3">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#12372A] tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[#12372A] mt-1 sm:mt-1.5">
            Real-time financial status of your dormitory
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all w-full sm:w-auto md:self-auto"
          onClick={handleEmailReport}
        >
          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          <span className="text-sm">Email Report</span>
        </Button>
      </div>

      {/* Desktop KPI Cards */}
      <div>
        <div className="hidden lg:grid lg:grid-cols-4 gap-4 md:gap-6">
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={index}
                className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
                    {kpi.title}
                  </CardTitle>
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${
                      kpi.trend === "up"
                        ? "bg-[#A5D6A7]"
                        : kpi.trend === "down"
                        ? "bg-red-100"
                        : "bg-[#E0E0E0]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        kpi.trend === "up"
                          ? "text-[#2E7D32]"
                          : kpi.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#333333]">
                    {kpi.value}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">
                    {kpi.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Carousel className="lg:hidden">
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={index}
                className="border border-gray-200 shadow-md bg-white"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
                    {kpi.title}
                  </CardTitle>
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${
                      kpi.trend === "up"
                        ? "bg-[#A5D6A7]"
                        : kpi.trend === "down"
                        ? "bg-red-100"
                        : "bg-[#E0E0E0]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        kpi.trend === "up"
                          ? "text-[#2E7D32]"
                          : kpi.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#333333]">
                    {kpi.value}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">
                    {kpi.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </Carousel>
      </div>

      <Card className="border border-gray-200 sm:border-2 shadow-md sm:shadow-lg bg-gradient-to-br from-white via-[#A5D6A7]/5 to-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-[#A5D6A7]/10 rounded-full blur-3xl -z-0"></div>

        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-4 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-[#12372A] truncate">
                Regular Payables
              </CardTitle>
              {payables.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-[#E8F5E9] text-[#2E7D32] text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0"
                >
                  {payables.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm text-gray-600 truncate">
              Recurring monthly expenses
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => handleAddPayable()}
            className="gap-2 bg-[#2E7D32] text-white hover:bg-[#54ba59] hover:text-white w-full sm:w-auto text-xs sm:text-sm touch-manipulation active:scale-95 flex-shrink-0"
          >
            <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Add Payable</span>
          </Button>
        </CardHeader>
        <CardContent className="relative z-10">
          {payables.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-3 sm:px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#E8F5E9] mb-3 sm:mb-4">
                <Wallet className="h-7 w-7 sm:h-8 sm:w-8 text-[#2E7D32]" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-[#12372A] mb-1.5 sm:mb-2">
                No Payables Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 truncate">
                Start by adding your first recurring expense
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPayable()}
                className="gap-2 bg-[#2E7D32] text-white hover:bg-[#54ba59] hover:text-white text-xs sm:text-sm"
              >
                <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">Add First Payable</span>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Mobile: Show paginated items, Desktop: Show all */}
                {(typeof window !== 'undefined' && window.innerWidth < 640
                  ? payables.slice((payablesPage - 1) * payablesPerPage, payablesPage * payablesPerPage)
                  : payables
                ).map((payable) => (
                  <PayableItem
                    key={payable.id}
                    payable={payable}
                    onEdit={handleEditPayable}
                  />
                ))}
              </div>
              
              {/* Pagination controls for mobile */}
              {payables.length > payablesPerPage && (
                <div className="flex items-center justify-between mt-4 sm:hidden">
                  <p className="text-xs text-gray-600">
                    Showing {((payablesPage - 1) * payablesPerPage) + 1} to {Math.min(payablesPage * payablesPerPage, payables.length)} of {payables.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPayablesPage(p => Math.max(1, p - 1))}
                      disabled={payablesPage === 1}
                      className="h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-gray-700 px-2">
                      {payablesPage} / {Math.ceil(payables.length / payablesPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPayablesPage(p => Math.min(Math.ceil(payables.length / payablesPerPage), p + 1))}
                      disabled={payablesPage >= Math.ceil(payables.length / payablesPerPage)}
                      className="h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <FinesCards
        fines={payableFines}
        handleAddFine={() => setIsAddFineModalOpen(true)}
        handleEditFine={ (fine) => {
          setFineToEdit(fine);
          if(fineToEdit){
            setIsAddFineModalOpen(true);
          }
        }}
      />

      <AddFineModal
        isOpen={isAddFineModalOpen}
        onClose={() => setIsAddFineModalOpen(false)}
        onSave={handleSaveFine}
        fine={fineToEdit}
      />

      <AddPayableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSavePayable}
        payable={payableToEdit}
      />

      {/* Recent Activity */}
      <Card className="border border-gray-200 shadow-md bg-gradient-to-br from-white to-gray-50 gap-0">
        <CardHeader className="pb-2.5 sm:pb-3 md:pb-4 border-b border-gray-100">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-[#12372A] truncate">
                  Recent Transactions
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                  Latest payment and expense activities
                </p>
              </div>
              {recentTransactions.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-[#E8F5E9] text-[#2E7D32] text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0"
                >
                  {recentTransactions.length}
                </Badge>
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#A5D6A7] flex-shrink-0"></div>
                <span>Payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-100 flex-shrink-0"></div>
                <span>Expenses</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2.5 sm:pt-3 md:pt-4">
          <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 sm:py-8 md:py-12 px-3 sm:px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 mb-2 sm:mb-3">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-xs sm:text-sm md:text-base">
                  No transactions yet
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
                  Transactions will appear here once recorded
                </p>
              </div>
            ) : (
              recentTransactions.map((activity) => (
                <div
                  key={activity.id}
                  className="group relative flex flex-col gap-2 sm:gap-2.5 p-2.5 sm:p-3 md:p-4 rounded-lg border border-gray-100 bg-white hover:shadow-md hover:border-[#2E7D32] transition-all duration-200 active:scale-[0.99] touch-manipulation"
                >
                  {/* left side - icon and description */}
                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        activity.type === "payment"
                          ? "bg-[#A5D6A7] group-hover:bg-[#2E7D32]"
                          : "bg-red-100 group-hover:bg-red-200"
                      }`}
                    >
                      {activity.type === "payment" ? (
                        <TrendingUp
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-colors ${
                            activity.type === "payment"
                              ? "text-[#2E7D32] group-hover:text-white"
                              : "text-red-600"
                          }`}
                        />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm md:text-base font-semibold text-[#333333] line-clamp-2 group-hover:text-[#12372A] transition-colors leading-snug">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 pt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-gray-300 text-xs">•</span>
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-0 ${
                            activity.type === "payment"
                              ? "bg-[#A5D6A7]/20 text-[#2E7D32]"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {activity.type === "payment" ? "Payment" : "Expense"}
                        </Badge>
                      </div>
                    </div>

                    <div
                      className={`flex-shrink-0 font-bold text-xs sm:text-sm md:text-base ${
                        activity.type === "payment"
                          ? "text-[#2E7D32]"
                          : "text-red-600"
                      }`}
                    >
                      {activity.type === "payment" ? "+" : "-"}₱
                      {activity.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
