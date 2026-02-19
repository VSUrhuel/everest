"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Carousel } from "@/components/ui/carousel";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, CreditCard, LogOut, DollarSign, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { dashboardData, recentBills } from "@/lib/user/dashboard";
import { Bill } from "../admin/dormers/types";
import { formatAmount } from "../admin/expenses/utils";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";

const userPayments = [
  {
    id: 1,
    period: "2025-08",
    amountDue: 250,
    amountPaid: 250,
    balance: 0,
    status: "Paid",
    dueDate: "2025-08-15",
  },
  {
    id: 2,
    period: "2025-09",
    amountDue: 250,
    amountPaid: 0,
    balance: 250,
    status: "Pending",
    dueDate: "2025-09-15",
  },
  {
    id: 3,
    period: "2025-10",
    amountDue: 250,
    amountPaid: 0,
    balance: 250,
    status: "Pending",
    dueDate: "2025-10-15",
  },
];

export default function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [totalDue, setTotalDue] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { dormitoryId, loading: dormitoryIdLoading } = useCurrentDormitoryId();

  // Handle authentication first
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User) => {
      if (!currentUser) {
        // If no user is found, redirect to the login page
        window.location.href = "/";
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  // Then fetch data only when user is available
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!user) return; // Don't fetch if no user

      try {
        setIsLoading(true);
        
        const USE_MOCK_DATA = false;
        
        if (USE_MOCK_DATA) {
          // mock dashboard data
          if (!mounted) return;
          setTotalDue(15000);
          setTotalPayments(12500);
          setTotalExpenses(8500);
          setRemainingBalance(4000);
          setTotalBills(5);
          
          // mock bills data for non-empty state testing
          const mockBills: Bill[] = [
            {
              payableId: "1",
              id: "1",
              dormerId: user.uid,
              billingPeriod: "January 2025",
              totalAmountDue: 3000,
              amountPaid: 3000,
              remainingBalance: 0,
              status: "Paid",
              description: "Monthly dorm fees",
              dormer: null,
              billDate: new Date(),
              updatedAt: new Date()
            },
            {
              payableId: "2",
              id: "2",
              dormerId: user.uid,
              billingPeriod: "February 2025",
              totalAmountDue: 3500,
              amountPaid: 3500,
              remainingBalance: 0,
              status: "Paid",
              description: "Monthly dorm fees + utilities",
              dormer: null,
              billDate: new Date(),
              updatedAt: new Date()
            },
            {
              payableId: "3",
              id: "3",
              dormerId: user.uid,
              billingPeriod: "March 2025",
              totalAmountDue: 3000,
              amountPaid: 2000,
              remainingBalance: 1000,
              status: "Partially Paid",
              description: "Monthly dorm fees",
              dormer: null,
              billDate: new Date(),
              updatedAt: new Date()
            },
            {
              payableId: "4",
              id: "4",
              dormerId: user.uid,
              billingPeriod: "April 2025",
              totalAmountDue: 3500,
              amountPaid: 0,
              remainingBalance: 3500,
              status: "Unpaid",
              description: "Monthly dorm fees + maintenance",
              dormer: null,
              billDate: new Date(),
              updatedAt: new Date()
            },
            {
              payableId: "5",
              id: "5",
              dormerId: user.uid,
              billingPeriod: "May 2025",
              totalAmountDue: 3000,
              amountPaid: 0,
              remainingBalance: 3000,
              status: "Unpaid",
              description: "Monthly dorm fees",
              dormer: null,
              billDate: new Date(),
              updatedAt: new Date()
            }
          ];
          
          setBills(mockBills);
        } else {
          // real data fetching
          const data = await dashboardData(dormitoryId);
          if (!mounted) return;

          setTotalDue(data.totalDue);
          setTotalPayments(data.totalPayments);
          setTotalExpenses(data.totalExpenses);
          setRemainingBalance(data.remainingBalance);
          setTotalBills(data.totalBills);

          // Only fetch bills if user exists
          const userBills = await recentBills(user.uid);
          if (!mounted) return;
          setBills(userBills);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user, dormitoryId]); // This effect depends on user and dormitoryId

  //console.log("Bills:", bills);

  const statsCards = [
    {
      title: "Total Amount Due",
      value: `₱${formatAmount(totalDue)}`,
      description: "Amount to be Paid by Dormers",
      icon: DollarSign,
      color: "text-[#12372A]",
    },
    {
      title: "Total Amount Paid",
      value: `₱${formatAmount(totalPayments)}`,
      description: "Overall Payments",
      icon: TrendingUp,
      color: "text-[#2E7D32]",
    },
    {
      title: "Dorm Fund Balance",
      value: `₱${formatAmount(remainingBalance)}`,
      description: "Available Money",
      icon: Wallet,
      color: "text-red-600",
    },
    {
      title: "Total Dorm Expenses",
      value: `₱${formatAmount(totalExpenses)}`,
      description: "Overall Expenses",
      icon: TrendingDown,
      color: "text-[#2E7D32]",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] p-8">
        {/* header dkeleton */}
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* body*/}
        <div className="mb-8">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className={undefined}>
              <Skeleton className="h-9 w-24 mb-2" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
          <div className="flex justify-center gap-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-2 w-2 rounded-full" />
            ))}
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader className={undefined}>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className={undefined}>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                >
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-5 w-20 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">

      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#12372A] tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm md:text-base text-[#12372A] mt-1 sm:mt-1.5">
            View dormitory funds summary
          </p>
        </div>
      </div>

      <div>
        {/* desktop: grid display */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4 md:gap-6">
                {statsCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card
                      key={index}
                      className="shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-[#2E7D32]"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-slate-600 truncate pr-2">
                            {stat.title}
                          </CardTitle>
                          <div className="p-2 bg-[#E8F5E9] rounded-lg flex-shrink-0">
                            <Icon className="h-5 w-5 text-[#2E7D32]" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className={undefined}>
                        <p className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {stat.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* mobile: carousel */}
              <Carousel className="lg:hidden">
                {statsCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-[#2E7D32]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-slate-600 truncate pr-2">
                            {stat.title}
                          </CardTitle>
                          <div className="p-2 bg-[#E8F5E9] rounded-lg flex-shrink-0">
                            <Icon className="h-5 w-5 text-[#2E7D32]" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className={undefined}>
                        <p className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {stat.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </Carousel>
            </div>

      {/* Payment Overview */}
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 sm:pb-4 lg:pb-3">
          <CardTitle className="text-base sm:text-lg md:text-xl lg:text-lg font-bold text-[#12372A]">Payment Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-gray-600">
            Your recent payment history
          </CardDescription>
        </CardHeader>
        <CardContent className={undefined}>
          {bills.length === 0 ? (
            <div className="text-center py-8 sm:py-12 lg:py-8 px-3 sm:px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 lg:w-14 lg:h-14 rounded-full bg-[#E8F5E9] mb-3 sm:mb-4 lg:mb-3">
                <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 lg:h-6 lg:w-6 text-[#2E7D32]" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg lg:text-base font-semibold text-[#12372A] mb-1.5 sm:mb-2 lg:mb-1.5">
                No Payment History
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Your payment history will appear here once you make your first payment.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 lg:space-y-2.5">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 sm:p-4 lg:p-3 border border-slate-200 rounded-lg hover:border-[#2E7D32] transition-colors duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base lg:text-sm text-[#12372A] truncate">
                      Period {bill.billingPeriod}
                    </p>
                    <p className="text-xs sm:text-sm lg:text-xs text-slate-500 truncate">
                      Amount: ₱{formatAmount(bill.totalAmountDue)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-medium text-sm sm:text-base lg:text-sm text-[#12372A]">
                      ₱{formatAmount(bill.amountPaid)}
                    </p>
                    <span
                      className={`text-xs sm:text-sm lg:text-xs px-2 py-0.5 sm:py-1 lg:py-0.5 rounded inline-block mt-1 font-medium ${
                        bill.status === "Paid"
                          ? "bg-[#E8F5E9] text-[#2E7D32]"
                          : bill.status === "Partially Paid"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {bill.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
