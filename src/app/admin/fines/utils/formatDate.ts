import { Timestamp } from "firebase/firestore";

export const formatDate = (date: Timestamp | Date) => {
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};