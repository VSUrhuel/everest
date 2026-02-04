import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const skeletonRows = Array.from({ length: 5 });

export function FinesPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>    

      {/* Filters Skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <Skeleton className="h-10 w-full md:w-1/3" />
        <Skeleton className="h-10 w-full md:w-1/4" />
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg">
        <Table className={undefined}>
          <TableHeader className={undefined}>
            <TableRow className={undefined}>
              <TableHead className={undefined}>
                <Skeleton className="h-5 w-24" />
              </TableHead>
              <TableHead className={undefined}>
                <Skeleton className="h-5 w-32" />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <Skeleton className="h-5 w-40" />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <Skeleton className="h-5 w-20" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="h-5 w-28 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={undefined}>
            {skeletonRows.map((_, index) => (
              <TableRow key={index} className={undefined}>
                <TableCell className={undefined}>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell className={undefined}>
                  <Skeleton className="h-5 w-36" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-5 w-44" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-4 py-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
