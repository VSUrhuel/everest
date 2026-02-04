"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchDormitoryIdByUid } from "@/lib/admin/dormer";
import { getDormitoryById } from "@/lib/vsu-admin/dormitory";

export function useCurrentDormitoryId() {
    const [dormitoryId, setDormitoryId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [dormitoryName, setDormitoryName] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const uid = user.uid;
                setDormitoryId(await fetchDormitoryIdByUid(uid));
                setLoading(false);
            } else {
                setDormitoryId(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchDormitoryData = async () => {
            const dormData = await getDormitoryById(dormitoryId)
            setDormitoryName(dormData?.name)
        }
        fetchDormitoryData();
    }, [dormitoryId])

    return { dormitoryId, dormitoryName, loading };
}
