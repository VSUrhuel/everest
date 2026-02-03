import { useEffect, useMemo, useState } from "react";
import { Fine, FineSummary, PaymentFines, PaymentFinesData } from "../types";
import { getFines, getFinesSummary } from "@/lib/admin/fines";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { Dormer } from "../../dormers/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";

export const useFinesData = () =>{
    const [payableFines, setPayableFines] = useState<Fine[]>([])
    const [fines, setFines] = useState<PaymentFines[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { dormitoryId, loading: authLoading } = useCurrentDormitoryId();
    const [summary, setSummary] = useState<FineSummary | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dormers, setDormers] = useState<Dormer[]>([]);

    const itemsPerPage = 10;
    useEffect(() => {
        if (authLoading || !dormitoryId) return;

        const unsubscribeFinesPayment = onSnapshot(
            query(collection(db, "finesPayment"), where("dormitoryId", "==", dormitoryId)),
            (snapshot) => {
                const finesData = snapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() } as PaymentFines)
                );
                // Sort fines by createdAt in descending order (most recent first)
                const sortedFines = finesData.sort((a, b) => {
                    const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any)?.toDate?.() || new Date();
                    const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any)?.toDate?.() || new Date();
                    return dateB.getTime() - dateA.getTime();
                });
                setFines(sortedFines);
                setLoading(false);
            }
        );

        const unsubscribeFinesPayable = onSnapshot(
            query(collection(db, "fines"), where("dormitoryId", "==", dormitoryId)),
            (snapshot) => {
                const finesData = snapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() } as Fine)
                );
                setPayableFines(finesData);
                setLoading(false);
            }
        );

        const fetchSummary = async () => {
            const summary = await getFinesSummary(dormitoryId);
            setSummary(summary);
            setLoading(false);
        }

        // Fetch all dormers (including admins) for mapping recordedBy and imposedBy
        const unsubscribeDormers = onSnapshot(
              query(collection(db, "dormers"), where("dormitoryId", "==", dormitoryId)),
              (snapshot) => {
                const dormerData = snapshot.docs
                  .map((doc) => ({ id: doc.id, ...doc.data() } as Dormer))
                  .filter(
                    (dormer) => dormer.isDeleted !== true
                  );
                // console.log('All dormers fetched (including admins):', dormerData.map(d => ({ 
                //     id: d.id, 
                //     name: `${d.firstName} ${d.lastName}`, 
                //     role: d.role, 
                //     email: d.email 
                // })));
                setDormers(dormerData);
                setLoading(false);
              }
            );

        fetchSummary();

        return () => {
            unsubscribeFinesPayment();
            unsubscribeDormers();
            unsubscribeFinesPayable();
        };
    }, [dormitoryId, authLoading]);

    const dormersWithFines = useMemo(() => {
        if(!dormers.length) return [];
        // Create maps for both UID and email lookup (for legacy data)
        const dormersMap = new Map(dormers.map(d => [d.id, d]));
        const dormersByEmail = new Map(dormers.map(d => [d.email?.toLowerCase(), d]));
        
        // console.log('Dormers map keys (UIDs):', Array.from(dormersMap.keys()));
        // console.log('Dormers by email keys:', Array.from(dormersByEmail.keys()));
        
        // Helper function to resolve user by UID or email
        const resolveUser = (identifier: string | undefined): Dormer => {
            if (!identifier) return { firstName: "Unknown", lastName: "User", email: "" } as Dormer;
            
            // Try to find by UID first
            let user = dormersMap.get(identifier);
            console.log(`Resolving "${identifier}" by UID: ${user ? `Found ${user.firstName} ${user.lastName}` : 'NOT FOUND'}`);
            
            // If not found and it looks like an email, try email lookup (case-insensitive)
            if (!user && identifier.includes('@')) {
                const normalizedEmail = identifier.toLowerCase();
                user = dormersByEmail.get(normalizedEmail);
                //console.log(`  Trying email "${normalizedEmail}": ${user ? `Found ${user.firstName} ${user.lastName}` : 'NOT FOUND'}`);
            }
            
            if (!user) {
                console.warn(`Could not resolve user for identifier: "${identifier}"`);
            }
            
            return user || { firstName: "Unknown", lastName: "User", email: "" } as Dormer;
        };
        
        return dormers.map((dormer) => ({
            ...dormer,
            fines: fines.filter((fine) => fine.dormerId === dormer.id)
            .map(fine => ({
                ...fine,
                recordedBy: typeof fine.recordedBy === "string"
                    ? resolveUser(fine.recordedBy)
                    : fine.recordedBy,
                imposedBy: typeof fine.imposedBy === "string"
                    ? resolveUser(fine.imposedBy)
                    : fine.imposedBy
            }))
        }))
    }, [dormers, fines]);

    const filteredDormers = useMemo(() => {
        return dormersWithFines.filter((dormer) => {
            const matchesSearch = `${dormer.firstName} ${dormer.lastName}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === "All" || dormer.roomNumber === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [dormersWithFines, searchTerm, statusFilter]);

    const paginatedDormers = useMemo(() => {
        const indexOfLastDormer = currentPage * itemsPerPage;
        const indexOfFirstDormer = indexOfLastDormer - itemsPerPage;
        return filteredDormers.slice(indexOfFirstDormer, indexOfLastDormer);
    }, [filteredDormers, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredDormers.length / itemsPerPage);
    }, [filteredDormers, itemsPerPage]);

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
    return { fines, payableFines, loading, error, summary, paginatedDormers, totalPages, currentPage, searchTerm, setSearchTerm, statusFilter, setStatusFilter, handleNextPage, handlePreviousPage, dormers, dormersWithFines };
}