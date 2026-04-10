"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { firestore as db } from "../../../../../lib/firebase";
import { useParams } from "next/navigation";
import { Dormer } from "../../../dormers/types";
import { Event, EventPayment, EventDormerData } from "../../types";
import { toast } from "sonner";
import { getEventPayment } from "@/lib/admin/event";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";

export function useEventData() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [dormers, setDormers] = useState<Dormer[]>([]);
  const [payments, setPayments] = useState<EventPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("Descending");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {dormitoryId, loading: eventDormitoryLoading } = useCurrentDormitoryId();

  useEffect(() => {
    if(!eventDormitoryLoading && !dormitoryId) {
      setLoading(false);
      return;
    }
    if (!eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const dormersQuery = query(
      collection(db, "dormers"),
      where("role", "==", "User"),
      where("dormitoryId", "==", dormitoryId)
    );
    const unsubscribeDormers = onSnapshot(dormersQuery, (snapshot) => {
      setDormers(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Dormer))
      );
    });

    const eventDocRef = doc(db, "events", eventId);
    const unsubscribeEvent = onSnapshot(eventDocRef, (doc) => {
      if (doc.exists()) {
        setEvent({ id: doc.id, ...doc.data() } as Event);
      } else {
        toast.error("Event not found!");
        setEvent(null);
      }
      setLoading(false);
    });

    const paymentsQuery = query(
      collection(db, "eventPayments"),
      where("eventId", "==", eventId),
      where("dormitoryId", "==", dormitoryId)
    );
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as EventPayment)
        )
      );
    });

    return () => {
      unsubscribeDormers();
      unsubscribeEvent();
      unsubscribePayments();
    };
  }, [eventId, dormitoryId, eventDormitoryLoading]);

  const eventDormersData: EventDormerData[] = useMemo(() => {
    const paymentsMap = new Map(payments.map((p) => [p.dormerId, p]));
    return dormers.map((dormer) => {
      const payment = paymentsMap.get(dormer.id);
      return {
        ...dormer,
        paymentStatus: payment?.status ?? "Unpaid",
        amountPaid: payment?.amount ?? 0,
        paymentDate: payment?.createdAt ?? null,
        paymentMethod: payment?.paymentMethod ?? null,
        recordedBy: payment?.recordedBy ?? null,
      };
    }).filter((d) => !d.isDeleted || d.paymentStatus === "Paid");
  }, [dormers, payments]);

  const filteredDormers = useMemo(() => {
    let filtered = eventDormersData.filter((dormer) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        dormer.firstName?.toLowerCase().includes(searchLower) ||
        dormer.lastName?.toLowerCase().includes(searchLower) ||
        dormer.email?.toLowerCase().includes(searchLower);
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
  }, [eventDormersData, searchTerm, statusFilter, sortFilter]);

  const paginatedDormers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDormers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDormers, currentPage]);

  const totalPages = Math.ceil(filteredDormers.length / itemsPerPage);

  const stats = useMemo(() => {
    const totalDormers = eventDormersData.length;
    const paidDormers = eventDormersData.filter(
      (d) => d.paymentStatus === "Paid"
    ).length;
    const unpaidDormers = totalDormers - paidDormers;
    const totalCollected = eventDormersData.reduce(
      (sum, d) => sum + d.amountPaid,
      0
    );
    const collectionProgress =
      totalDormers > 0 ? (paidDormers / totalDormers) * 100 : 0;
    return {
      totalDormers,
      paidDormers,
      unpaidDormers,
      totalCollected,
      collectionProgress,
    };
  }, [eventDormersData]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortFilter]);

  return {
    eventId,
    loading,
    event,
    paginatedDormers,
    filteredDormers,
    stats,
    totalPages,
    currentPage,
    setCurrentPage,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortFilter,
    setSortFilter,
    handleNextPage,
    handlePreviousPage,
    dormers,
    payments,
  };
}
