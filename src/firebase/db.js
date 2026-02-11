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
import { getSignedUrl } from "../supabaseClient";

// --- Helpers ---

const getUid = () => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    return user.uid;
};

// Transforms an entry from DB (with paths) to UI (with signed URLs)
const transformEntryForRead = async (entry) => {
    if (!entry) return entry;

    const newImages = await Promise.all((entry.images || []).map(async (item) => {
        // If it looks like a Supabase path (does not start with http/data), get signed URL
        if (typeof item === 'string' && !item.startsWith('http') && !item.startsWith('data:')) {
            const url = await getSignedUrl(item, 'uploads');
            return url || item;
        }
        return item;
    }));

    const newAudio = await Promise.all((entry.audioNotes || []).map(async (item) => {
        if (typeof item === 'string' && !item.startsWith('http') && !item.startsWith('data:') && !item.startsWith('blob:')) {
            const url = await getSignedUrl(item, 'uploads');
            return url || item;
        }
        return item;
    }));

    return {
        ...entry,
        images: newImages,
        audioNotes: newAudio
    };
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
