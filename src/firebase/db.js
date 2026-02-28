import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy
} from "firebase/firestore";
import { db, auth } from "./config";// --- Helpers ---

const getUid = () => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    return user.uid;
};

// Transforms an entry from DB (with paths) to UI (with signed URLs)
// Since we are moving to Firebase Storage, URLs are publicly readable/persistent.
// Supabase logic is removed to avoid timeout errors for users with ISP blocks.
const transformEntryForRead = async (entry) => {
    return entry;
};

// --- Entry Functions ---

export const saveEntry = async (dateKey, data) => {
    const uid = getUid();
    const docRef = doc(db, "users", uid, "entries", dateKey);

    await setDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

export const getEntry = async (dateKey) => {
    const uid = getUid();
    const docRef = doc(db, "users", uid, "entries", dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const rawData = snap.data();
        return await transformEntryForRead(rawData);
    } else {
        return null;
    }
};

export const getAllEntries = async () => {
    const uid = getUid();
    const entriesRef = collection(db, "users", uid, "entries");
    const q = query(entriesRef, orderBy("updatedAt", "desc"));

    const querySnapshot = await getDocs(q);
    const entries = {};

    // NOTE: We do NOT generate signed URLs for getAllEntries to avoid 
    // massive performance hits. Components using this (Calendar, Timeline)
    // should ideally use the raw data or only fetch signed URLs when needed (e.g. expanding an item).
    // Current Timeline/Search components only check if images.length > 0, they don't display them.
    // So we can return raw paths.

    querySnapshot.forEach((doc) => {
        entries[doc.id] = doc.data();
    });
    return entries;
};
