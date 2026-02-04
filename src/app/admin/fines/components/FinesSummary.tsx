"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Carousel } from "../../../../components/ui/carousel";
import { TrendingDown, Calendar, Tag } from "lucide-react";
import { FineSummary } from "../types";
import { formatAmount } from "../../expenses/utils";
export default function FinesSummary({
  totalFines,
  collectedFines,
  collectibleFines,
}: FineSummary) {

  const kpiData = [
    {
      title: "Total Fines",
      value: `₱${formatAmount(totalFines)}`,
      description: "All recorded fines",
      icon: TrendingDown,
      trend: "down",
    },
    {
      title: "Collectible Fines",
      value: `₱${formatAmount(collectibleFines)}`,
      description: "Fines that can be collected",
      icon: Calendar,
      trend: "neutral",
    },
    {
      title: "Collected Fines",
      value: `₱${formatAmount(collectedFines)}`,
      description: "Fines collected",
      icon: Tag,
      trend: "up",
    },
  ];

  return (
    <>
      {/* mobile carousel */}
      <Carousel className="lg:hidden">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="border border-gray-200 shadow-md bg-white">
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
              <CardContent className={undefined}>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#333333]">
                  {kpi.value}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-1.5 truncate">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </Carousel>

      {/* desktop grid */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 md:gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={index}
              className="border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                <CardTitle className="text-sm font-semibold text-gray-600 truncate pr-2">
                  {kpi.title}
                </CardTitle>
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 ${
                    kpi.trend === "up"
                      ? "bg-[#A5D6A7]"
                      : kpi.trend === "down"
                      ? "bg-red-100"
                      : "bg-[#E0E0E0]"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      kpi.trend === "up"
                        ? "text-[#2E7D32]"
                        : kpi.trend === "down"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent className={undefined}>
                <div className="text-xl md:text-2xl font-bold text-[#333333]">
                  {kpi.value}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-1.5 truncate">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
