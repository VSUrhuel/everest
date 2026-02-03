"use client";

import React from "react";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, firestore as db } from "@/lib/firebase";
import { formatAmount } from "@/app/admin/expenses/utils";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { getFinesPayment } from "@/lib/admin/fines";
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore";
import { PaymentFines, PaymentFinesData } from "@/app/admin/fines/types";
import { calculateFinePaymentSummary } from "./utils/payment-summary";
import RoomFinesSection from "./components/RoomFinesSection";
import IndividualFinesTable from "./components/IndividualFinesTable";

export default function FinesUserPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userFinesPayments, setUserFinesPayments] = useState<PaymentFinesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomFines, setRoomFines] = useState<PaymentFinesData[]>([]);
  const [individualFines, setIndividualFines] = useState<PaymentFinesData[]>([]);
  const { dormitoryId, loading: dormitoryLoading } = useCurrentDormitoryId();

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

  useEffect(() => {
    const fetchUserFinesPayments = async () => {
      if (user && dormitoryId) {
        try {
          setLoading(true);
          
          const payments = await getFinesPayment(user.uid, dormitoryId);
          
          // Helper function to find dormer by email or uid
          const findDormerByIdentifier = async (identifier: string) => {
            if (!identifier) return null;
            
            try {
              // First try as a document ID
              const userDoc = await getDoc(doc(db, "dormers", identifier));
              if (userDoc.exists()) {
                return { id: userDoc.id, ...userDoc.data() };
              }
              
              // If not found, try querying by email
              const emailQuery = query(
                collection(db, "dormers"),
                where("email", "==", identifier)
              );
              const emailSnapshot = await getDocs(emailQuery);
              
              if (!emailSnapshot.empty) {
                const firstDoc = emailSnapshot.docs[0];
                return { id: firstDoc.id, ...firstDoc.data() };
              }
              
              return null;
            } catch (error) {
              console.error("Error finding dormer:", error);
              return null;
            }
          };
          
          // Populate recordedBy and imposedBy for each payment
          const paymentsWithUser = await Promise.all(payments.map(async (payment) => {
            let recordedByUser = null;
            let imposedByUser = null;
            
            if (payment.recordedBy && typeof payment.recordedBy === "string") {
              recordedByUser = await findDormerByIdentifier(payment.recordedBy);
            }
            
            if (payment.imposedBy && typeof payment.imposedBy === "string") {
              imposedByUser = await findDormerByIdentifier(payment.imposedBy);
            }
            
            return {
              ...payment,
              recordedBy: recordedByUser,
              imposedBy: imposedByUser
            };
          }));
          
          const sortedPayments = paymentsWithUser.sort((a, b) => {
            const dateA = a.dateImposed instanceof Date ? a.dateImposed : (a.dateImposed as any)?.toDate?.() || new Date();
            const dateB = b.dateImposed instanceof Date ? b.dateImposed : (b.dateImposed as any)?.toDate?.() || new Date();
            return dateB.getTime() - dateA.getTime();
          });
          
          setUserFinesPayments(sortedPayments as PaymentFinesData[]);
          
          // Separate room fines and individual fines
          const room = sortedPayments.filter((fine) => fine.roomFineId) as PaymentFinesData[];
          const individual = sortedPayments.filter((fine) => !fine.roomFineId) as PaymentFinesData[];
          setRoomFines(room);
          setIndividualFines(individual);
        } catch (error) {
          console.error("Error fetching user payments:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchUserFinesPayments();
  }, [user, dormitoryId]);

  // Add loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <div className="space-y-2">
            <div className="h-8 sm:h-10 w-40 sm:w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 sm:h-5 w-48 sm:w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-80 sm:h-96 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Return the JSX
  return (
    <div className="min-h-screen bg-[#f0f0f0] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#12372A] tracking-tight">
            My Fines
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[#12372A] mt-1 sm:mt-1.5">
            View your fine payable and payment history
          </p>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-md bg-white gap-0">
        <CardHeader className="border-b border-gray-100 pb-0">
          <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-[#12372A]">
            Fine Records
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
            All your dormitory fine payable and balances
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {userFinesPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-3 sm:px-4">
              <div className="relative mb-4 sm:mb-6 inline-block">
                <div className="absolute inset-0 bg-gray-100/50 rounded-full blur-2xl"></div>
                <div className="relative p-4 sm:p-6 rounded-full bg-[#E0E0E0]">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#333333] mb-2">
                No Fine Payment Records Found
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 text-center max-w-md px-4">
                You don't have any fine payment records yet. They will appear here once fines are generated.
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 md:p-6 space-y-6">
              {/* Room Fines Section */}
              {roomFines.length > 0 && (
                <RoomFinesSection roomFines={roomFines} />
              )}

              {/* Individual Fines Table */}
              {individualFines.length > 0 && (
                <IndividualFinesTable fines={individualFines} />
              )}

              {/* Summary Footer */}
                  <div className="pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1 font-medium">
                          Total Amount Due
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-[#333333]">
                          ₱
                          {formatAmount(
                            calculateFinePaymentSummary(userFinesPayments as any).totalAmountDue
                          )}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-[#A5D6A7]/10 to-white p-4 rounded-xl border border-[#A5D6A7]/30">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1 font-medium">
                          Total Amount Paid
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-[#2E7D32]">
                          ₱
                          {formatAmount(
                            calculateFinePaymentSummary(userFinesPayments as any).totalAmountPaid
                          )}
                        </p>
                      </div>
                      <div className={`bg-gradient-to-br p-4 rounded-xl border ${
                        calculateFinePaymentSummary(userFinesPayments as any).totalBalance === 0
                          ? "from-[#A5D6A7]/10 to-white border-[#A5D6A7]/30"
                          : "from-red-50 to-white border-red-200"
                      }`}>
                        <p className="text-xs sm:text-sm text-gray-600 mb-1 font-medium">
                          Outstanding Balance
                        </p>
                        <p
                          className={`text-xl sm:text-2xl font-bold ${
                            calculateFinePaymentSummary(userFinesPayments as any)
                              .totalBalance === 0
                              ? "text-[#2E7D32]"
                              : "text-red-600"
                          }`}
                        >
                          ₱
                          {formatAmount(
                            calculateFinePaymentSummary(userFinesPayments as any).totalBalance
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                        <span>Payment Progress</span>
                        <span className="text-[#2E7D32] font-semibold">
                          {Math.round(
                            (calculateFinePaymentSummary(userFinesPayments as any).totalAmountPaid /
                              calculateFinePaymentSummary(userFinesPayments as any)
                                .totalAmountDue) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-[#2E7D32] to-[#A5D6A7] h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                          style={{
                            width: `${Math.min(
                              100,
                              (calculateFinePaymentSummary(userFinesPayments as any)
                                .totalAmountPaid /
                                calculateFinePaymentSummary(userFinesPayments as any)
                                  .totalAmountDue) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
