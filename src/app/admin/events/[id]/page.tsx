"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../../lib/firebase";
import { useEventData } from "./hooks/useEventData";
import { useEventActions } from "./hooks/useEventAction";
import { EventDormerData } from "../types";
import { Button } from "../../../../components/ui/button";
import { Carousel } from "../../../../components/ui/carousel";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import EventDormersTable from "../components/EventDormersTable";
import AddEventPaymentModal from "../components/AddEventPaymentModal";
import DormerFilters from "../../dormers/components/DormerFilters";

export default function EventDetailsContent() {
  const [user, setUser] = useState<User | null>(null);
  const {
    loading,
    event,
    paginatedDormers,
    stats,
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
    payments,
  } = useEventData();

  const { isSendingEmail, handlePaymentSubmit, remindPayable } =
    useEventActions(event, payments, dormers);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDormer, setSelectedDormer] = useState<EventDormerData | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) =>
      setUser(currentUser)
    );
    return () => unsubscribe();
  }, []);

  const handleLogPayment = (dormer: EventDormerData) => {
    setSelectedDormer(dormer);
    setPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#2E7D32] mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-[#333333] font-medium text-sm sm:text-base">Loading event details...</p>
        </div>
      </div>
    );
  }

  const eventData = [
    {
      name: 'Amount Due',
      value: event?.amountDue.toFixed(2) || "0.00",
      icon: DollarSign,
      description: 'per dormer'
    },
    {
      name: 'Participants',
      value: stats.totalDormers,
      icon: Users,
      description: 'Total dormers'
    },
    {
      name: 'Total Collected',
      value: stats.totalCollected.toFixed(2) || "0.00",
      icon: CheckCircle,
      description: `${Math.round(stats.collectionProgress)}% collected`
    },
    {
      name: 'Due Date',
      value: new Date(event.dueDate).toLocaleDateString(),
      icon: Calendar,
      description: 'Payment deadline'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Link href="/admin/events">
            <Button variant="ghost" size="sm" className="text-[#2E7D32] hover:bg-[#A5D6A7]/20 text-xs sm:text-sm">
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>
        <Card className="border-2 border-gray-100 shadow-md bg-white">
          <CardContent className="p-0">
            <div className="text-center py-12 sm:py-16 px-4">
              <div className="relative mb-4 sm:mb-6 inline-block">
                <div className="absolute inset-0 bg-red-100/50 rounded-full blur-2xl"></div>
                <div className="relative p-4 sm:p-6 rounded-full bg-red-500">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#333333] mb-2">Event Not Found</h1>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                The event you're looking for doesn't exist or may have been removed.
              </p>
              <Link href="/admin/events">
                <Button className="w-full sm:w-auto bg-[#2E7D32] hover:bg-[#A5D6A7] text-white font-semibold transition-all text-xs sm:text-sm" variant="default" size="default">
                  Return to Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <Link href="/admin/events">
          <Button variant="ghost" size="sm" className="text-[#2E7D32] hover:bg-[#A5D6A7]/20 font-medium text-xs sm:text-sm">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-100 shadow-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3" title={event.name}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#12372A] flex-1 min-w-0 line-clamp-2">{event.name}</h1>
              <Badge
                variant={event.status === "Active" ? "default" : "secondary"}
                className={
                  event.status === "Active"
                    ? "bg-[#A5D6A7] text-[#2E7D32] hover:bg-[#A5D6A7] font-semibold px-2 sm:px-3 sm:h-9 flex items-center text-xs sm:text-sm flex-shrink-0"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100 font-semibold px-2 sm:px-3 sm:h-9 flex items-center text-xs sm:text-sm flex-shrink-0"
                }
              >
                {event.status}
              </Badge>
            </div>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed mb-3">{event.description}</p>
          </div>
          <div className="lg:ml-5">
            <Button
              className="bg-[#2E7D32] hover:bg-[#A5D6A7] text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full lg:w-auto text-xs sm:text-sm"
              onClick={remindPayable}
              disabled={isSendingEmail || stats.unpaidDormers === 0}
              variant="default"
              size="default"
            >
              {isSendingEmail ? "Sending..." : "Send Reminder"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-3 sm:mb-4 md:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-[#12372A]">Event Statistics</h2>
      </div>

      {/* desktop view - grid */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
              Amount Due
            </CardTitle>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#E0E0E0] flex-shrink-0">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent className={undefined}>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#333333]">₱{event.amountDue.toFixed(2)}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">per dormer</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
              Participants
            </CardTitle>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#E0E0E0] flex-shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent className={undefined}>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#333333]">{stats.totalDormers}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">Total dormers assigned</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
              Total Collected
            </CardTitle>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#A5D6A7] flex-shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#2E7D32]" />
            </div>
          </CardHeader>
          <CardContent className={undefined}>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#2E7D32]">
              ₱{stats.totalCollected.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">
              {Math.round(stats.collectionProgress)}% collected
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
              Due Date
            </CardTitle>
            <div className="p-2 sm:p-2.5 rounded-xl bg-red-100 flex-shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className={undefined}>
            <p className="text-base sm:text-lg md:text-xl font-bold text-[#333333]">
              {new Date(event.dueDate).toLocaleDateString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">Payment deadline</p>
          </CardContent>
        </Card>
      </div>

      {/* mobile view - carousel */}
      <Carousel className="lg:hidden">
        {eventData.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="border border-gray-200 shadow-md bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 truncate pr-2">
                  {item.name}
                </CardTitle>
                <div
                  className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${
                    item.name === "Total Collected"
                      ? "bg-[#A5D6A7]"
                      : item.name === "Due Date"
                      ? "bg-red-100"
                      : "bg-[#E0E0E0]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      item.name === "Total Collected"
                        ? "text-[#2E7D32]"
                        : item.name === "Due Date"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent className={undefined}>
                <div className={`text-lg sm:text-xl md:text-2xl font-bold ${
                  item.name === "Total Collected" ? "text-[#2E7D32]" : "text-[#333333]"
                }`}>
                  {item.name === "Amount Due" || item.name === "Total Collected" 
                    ? `₱${item.value}` 
                    : item.value}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </Carousel>

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

      <EventDormersTable
        dormers={paginatedDormers}
        onLogPayment={handleLogPayment}
        eventAmount={event.amountDue}
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

      <AddEventPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        dormer={selectedDormer}
        currentUser={user}
        event={event}
        onSave={(data) => handlePaymentSubmit(data, user)}
      />
    </div>
  );
}
