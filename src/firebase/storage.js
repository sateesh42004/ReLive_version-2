import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "./config";

/**
 * Upload a file (Blob or File object) to Firebase Storage.
 * @param {Blob | File} file - The file to upload.
 * @param {string} path - The relative path (e.g., 'images/my-image.jpg').
 * @returns {Promise<string>} - The download URL.
 */
export const uploadFile = async (file, folder = "uploads") => {
    const user = auth.currentUser;
    if (!user) throw new Error("User must be logged in to upload files.");

    const timestamp = Date.now();
    // Generate a unique filename if possible, or use timestamp
    const fileName = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const storageRef = ref(storage, `users/${user.uid}/${folder}/${fileName}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
};

/**
 * Convert a base64 string to a Blob (helper for migration/upload).
 */
export const base64ToBlob = async (base64) => {
    const res = await fetch(base64);
    return await res.blob();
};
