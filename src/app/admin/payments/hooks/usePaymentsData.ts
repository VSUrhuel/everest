"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { auth, firestore as db } from "@/lib/firebase";
import { toast } from "sonner";
import { Dormer, Bill } from "../../dormers/types";
import { Payment, BillData } from "../types";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";

export function usePaymentsData() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [billingPeriodFilter, setBillingPeriodFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dormers, setDormers] = useState<Dormer[]>([]);
  const [loading, setLoading] = useState(true);
  const {dormitoryId, loading: loadingDormitoryId } = useCurrentDormitoryId();

  useEffect(() => {
    const collections = {
      payments: { setter: setPayments, loaded: false },
      bills: { setter: setBills, loaded: false },
      dormers: { setter: setDormers, loaded: false },
    };

    const checkAllLoaded = () => {
      if (Object.values(collections).every((c) => c.loaded)) {
        setLoading(false);
      }
    };

    if(!loadingDormitoryId && !dormitoryId) {
      setLoading(false);
      return;
    }
    const unsubscribers = Object.keys(collections).map((key) => {
      const q = query(collection(db, key), where("dormitoryId", "==", dormitoryId));
      return onSnapshot(
        q,
        (snapshot) => {
          let data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];

          (collections as any)[key].setter(data);
          (collections as any)[key].loaded = true;
          checkAllLoaded();
        },
        (error) => {
          console.error(`Error fetching ${key}:`, error);
          toast.error(`Failed to load ${key} data.`);
          setLoading(false);
        }
      );
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [dormitoryId, loadingDormitoryId]);

  const combinedBillData: BillData[] = useMemo(() => {
    if (loading || !bills.length || !dormers.length) {
      return [];
    }

    const dormersMap = new Map(dormers.map((d) => [d.id, d]));
    const paymentsByBill = payments.reduce((acc, payment) => {
      if (!acc[payment.billId]) {
        acc[payment.billId] = [];
      }
      acc[payment.billId].push(payment);
      return acc;
    }, {} as Record<string, Payment[]>);

    return bills
      .map((bill) => {
        const dormer = dormersMap.get(bill.dormerId);
        if (!dormer) return null;

        const associatedPayments = (paymentsByBill[bill.id] || [])
          .map((p) => ({
            ...p,
            recordedByUser: dormersMap.get(p.recordedBy),
          }))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        const totalPaidForBill = associatedPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const remainingBalance =
          bill.totalAmountDue - totalPaidForBill < 0
            ? 0
            : bill.totalAmountDue - totalPaidForBill;

        return {
          ...bill,
          remainingBalance,
          dormer,
          payments: associatedPayments,
          updatedAt: bill.updatedAt, // Ensure updatedAt is included
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [loading, payments, bills, dormers]);

  const uniqueBillingPeriods = useMemo(() => {
    if (!combinedBillData.length) return [];
    return [
      ...new Set(combinedBillData.map((bill) => bill.billingPeriod)),
    ].sort();
  }, [combinedBillData]);

  const filteredBills = useMemo(() => {
    return combinedBillData.filter((bill) => {
      if (!bill.dormer) return false;
      const matchesSearch =
        `${bill.dormer.firstName} ${bill.dormer.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        bill.dormer.roomNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        bill.billingPeriod.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || bill.status === statusFilter;

      const matchesBillingPeriod =
        billingPeriodFilter === "All" ||
        bill.billingPeriod === billingPeriodFilter;

      return matchesSearch && matchesStatus && matchesBillingPeriod;
    });
  }, [searchTerm, statusFilter, billingPeriodFilter, combinedBillData]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, billingPeriodFilter]);

  const summaryStats = useMemo(() => {
    return combinedBillData.reduce(
      (acc, bill) => {
        const amountPaid = bill.totalAmountDue - bill.remainingBalance;
        acc.totalAmountDue += bill.totalAmountDue;
        acc.totalAmountPaid += amountPaid;
        acc.totalRemainingBalance += bill.remainingBalance;
        return acc;
      },
      { totalAmountDue: 0, totalAmountPaid: 0, totalRemainingBalance: 0 }
    );
  }, [combinedBillData]);

  return {
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
    dormers,
    dormitoryId,
  };
}
