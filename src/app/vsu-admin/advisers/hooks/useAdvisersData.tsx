import { Dormer } from "@/app/admin/dormers/types"
import { useEffect, useState, useMemo } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { firestore as db } from "@/lib/firebase"

export const useAdvisersData = () => {
    const [advisers, setAdvisers] = useState<Dormer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        setLoading(true)
        const q = query(
            collection(db, "dormers"), 
            where("role", "==", "Adviser"), 
            where("isDeleted", "==", false)
        )

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Dormer[]
                setAdvisers(data)
                setLoading(false)
            },
            (err) => {
                console.error("Error fetching real-time advisers:", err)
                setError(err.message)
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [])

    const filteredAdvisers = useMemo(() => {
        return advisers.filter(adviser => 
            adviser.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adviser.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adviser.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [advisers, searchTerm])

    const totalPages = Math.ceil(filteredAdvisers.length / itemsPerPage)

    const paginatedAdvisers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredAdvisers.slice(start, start + itemsPerPage)
    }, [filteredAdvisers, currentPage])

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1)
    }

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1)
    }

    return {
        advisers,
        filteredAdvisers,
        paginatedAdvisers,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        handleNextPage,
        handlePreviousPage
    }
}