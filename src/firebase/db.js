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
import { db, auth } from "./config";

const getUidAsync = async () => {
    if (auth.currentUser) return auth.currentUser.uid;
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (user) resolve(user.uid);
            else reject(new Error("User not authenticated"));
        });
    });
};

const transformEntryForRead = async (entry) => {
    return entry;
};

// --- Entry Functions ---

export const saveEntry = async (uidOrDateKey, dateKeyOrData, maybeData) => {
    let uid, dateKey, data;
    if (maybeData !== undefined) {
        uid = uidOrDateKey; dateKey = dateKeyOrData; data = maybeData;
    } else {
        uid = await getUidAsync(); dateKey = uidOrDateKey; data = dateKeyOrData;
    }
    if (!uid) throw new Error("No UID provided");
    const docRef = doc(db, "users", uid, "entries", dateKey);

    await setDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

export const getEntry = async (uidOrDateKey, maybeDateKey) => {
    let uid, dateKey;
    if (maybeDateKey !== undefined) {
        uid = uidOrDateKey; dateKey = maybeDateKey;
    } else {
        uid = await getUidAsync(); dateKey = uidOrDateKey;
    }
    if (!uid) throw new Error("No UID provided");
    const docRef = doc(db, "users", uid, "entries", dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const rawData = snap.data();
        return await transformEntryForRead(rawData);
    } else {
        return null;
    }
};

export const getAllEntries = async (providedUid) => {
    const uid = providedUid || await getUidAsync().catch(() => null);
    if (!uid) return {};
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
