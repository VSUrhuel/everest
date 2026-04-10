import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { Dormer, Bill, Payable } from "../types";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";

export function useDormers() {
  const [dormers, setDormers] = useState<Dormer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("Descending");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const {dormitoryId, loading: dormitoryIdLoading} = useCurrentDormitoryId();

  useEffect(() => {
    if(!dormitoryIdLoading && !dormitoryId) {
      setLoading(false);
      return;
    }
    const unsubscribeDormers = onSnapshot(
      query(collection(db, "dormers"), where("dormitoryId", "==", dormitoryId)),
      (snapshot) => {
        const dormerData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Dormer))
          .filter(
            (dormer) => dormer.role === "User" && dormer.isDeleted !== true
          );
        setDormers(dormerData);
        setLoading(false);
      }
    );

    const unsubscribeBills = onSnapshot(
      query(collection(db, "bills"), where("dormitoryId", "==", dormitoryId)),
      (snapshot) => {
        const billData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Bill)
        );
        setBills(billData);
      }
    );

    const unsubscribePayables = onSnapshot(
      query(collection(db, "regularCharge"), where("dormitoryId", "==", dormitoryId)),
      (snapshot) => {
        const payableData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Payable)
        );
        setPayables(payableData);
      }
    );

    return () => {
      unsubscribeDormers();
      unsubscribeBills();
      unsubscribePayables();
    };
  }, [dormitoryId, dormitoryIdLoading]);

  const dormersWithBills = useMemo(() => {
    if (!dormers.length) return [];
    return dormers.map((dormer) => ({
      ...dormer,
      bills: bills
        .filter((bill) => bill.dormerId === dormer.id)
        .sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod)),
    }));
  }, [dormers, bills]);

  const filteredDormers = useMemo(() => {
    let filtered = dormersWithBills.filter((dormer) => {
      const matchesSearch = `${dormer.firstName} ${dormer.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || dormer.roomNumber === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortFilter === "Descending") {
      filtered.sort((a, b) => b.firstName.localeCompare(a.firstName));
    } else if (sortFilter === "Ascending") {
      filtered.sort((a, b) => a.firstName.localeCompare(b.firstName));
    }
    return filtered;
  }, [dormersWithBills, searchTerm, statusFilter, sortFilter]);

  const paginatedDormers = useMemo(() => {
    const indexOfLastDormer = currentPage * itemsPerPage;
    const indexOfFirstDormer = indexOfLastDormer - itemsPerPage;
    return filteredDormers.slice(indexOfFirstDormer, indexOfLastDormer);
  }, [filteredDormers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDormers.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return {
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
  };
}
