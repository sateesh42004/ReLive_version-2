import { saveEntry } from "./db";
import { auth } from "./config";

// --- CLOUDINARY CONFIGURATION ---
// TODO: Replace these two values with your actual Cloudinary details
const CLOUDINARY_CLOUD_NAME = "dtxuhf8zv";
const CLOUDINARY_UPLOAD_PRESET = "hackathon_preset"; // Make sure to create an "unsigned" upload preset in Cloudinary Settings -> Upload

const uploadToCloudinary = async (blob) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME" || CLOUDINARY_UPLOAD_PRESET === "YOUR_UPLOAD_PRESET") {
        throw new Error("Cloudinary not configured! Open src/firebase/sync.js and add your Cloud Name and Upload Preset.");
    }

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    // Using "auto" resource type works for both images and audio!
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        let errStr = res.statusText;
        try {
            const errData = await res.json();
            if (errData.error && errData.error.message) errStr = errData.error.message;
        } catch (e) { }
        throw new Error("Cloudinary Upload Error: " + errStr);
    }

    const data = await res.json();
    return data.secure_url; // the permanent public URL
};
/**
 * Robustly converts a DataURL (base64) to a Blob without using fetch().
 * This avoids "Failed to fetch" errors on large base64 strings in some browsers.
 */
const dataURLToBlob = (dataURL) => {
    try {
        const [header, base64] = dataURL.split(',');
        const mime = header.match(/:(.*?);/)[1];
        const binary = atob(base64);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: mime });
    } catch (e) {
        console.error("dataURLToBlob failed", e);
        return null;
    }
};

export const syncEntryToFirebase = async (dateKey, entryState) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // 1. Process Images
    const newImagesForUI = [];
    const newImagesForDB = [];

    for (const imgObj of (entryState.images || [])) {
        const isObject = typeof imgObj === 'object' && imgObj !== null;
        const src = isObject ? imgObj.src : imgObj;
        const title = isObject ? (imgObj.title || '') : '';

        if (typeof src === 'string' && src.startsWith('data:')) {
            try {
                const blob = dataURLToBlob(src);
                if (!blob) throw new Error("Failed to process image data.");

                const downloadURL = await uploadToCloudinary(blob);

                newImagesForDB.push({ src: downloadURL, title });
                newImagesForUI.push({ src: downloadURL, title });
            } catch (e) {
                console.error("Sync: Image upload failed", e);
                const errorStr = e.message || String(e);
                throw new Error("Image Upload Failed: " + errorStr);
            }
        } else {
            newImagesForDB.push({ src, title });
            newImagesForUI.push({ src, title });
        }
    }

    // 2. Process Audio
    const newAudioForUI = [];
    const newAudioForDB = [];

    for (const audio of (entryState.audioNotes || [])) {
        let blobToUpload = null;
        let isNewUpload = false;

        if (audio instanceof Blob) {
            blobToUpload = audio;
            isNewUpload = true;
        }
        else if (typeof audio === 'string' && audio.startsWith('blob:')) {
            try {
                const res = await fetch(audio);
                if (!res.ok) throw new Error(`Fetch status: ${res.status}`);
                blobToUpload = await res.blob();
                isNewUpload = true;
            } catch (e) {
                console.error("Local audio fetch failed", e);
                // Keep the local blob as is if we can't upload it (might be temporary)
            }
        }

        if (isNewUpload && blobToUpload) {
            try {
                const downloadURL = await uploadToCloudinary(blobToUpload);

                newAudioForDB.push(downloadURL);
                newAudioForUI.push(downloadURL);
            } catch (e) {
                console.error("Cloudinary file upload failed", e);
                const errorStr = e.message || String(e);
                if (errorStr.includes("Cloudinary not configured")) {
                    throw new Error(errorStr);
                }
                // Non-blocking for audio if one fails, but we'll throw for images as they are more critical
                newAudioForDB.push(audio);
                newAudioForUI.push(audio);
            }
        } else {
            newAudioForDB.push(audio);
            newAudioForUI.push(audio);
        }
    }

    const cleanData = {
        ...entryState,
        images: newImagesForDB,
        audioNotes: newAudioForDB,
    };

    await saveEntry(user.uid, dateKey, cleanData);

    return { images: newImagesForUI, audioNotes: newAudioForUI };
};
