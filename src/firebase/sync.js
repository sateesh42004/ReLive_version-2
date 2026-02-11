import { saveEntry } from "./db";
import { uploadToSupabase, getSignedUrl } from "../supabaseClient";
import { auth } from "./config";

// Robustly extracts the storage path from a Supabase Signed URL
const extractPathFromUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('/sign/')) {
            const afterSign = decoded.split('/sign/')[1]; // BUCKET/PATH?token...
            const bucketEndIndex = afterSign.indexOf('/');
            if (bucketEndIndex !== -1) {
                const pathWithToken = afterSign.substring(bucketEndIndex + 1);
                return pathWithToken.split('?')[0];
            }
        }
    } catch (e) {
        console.warn("Utils: Failed to extract path from URL", url);
    }
    return null;
};

export const syncEntryToFirebase = async (dateKey, entryState) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const getPath = (type) => `${user.uid}/${type}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // 1. Process Images
    const newImagesForUI = [];
    const newImagesForDB = [];

    for (const img of (entryState.images || [])) {
        if (typeof img === 'string' && img.startsWith('data:')) {
            try {
                const res = await fetch(img);
                const blob = await res.blob();
                const path = getPath('images');

                const storagePath = await uploadToSupabase(blob, path, 'uploads');
                const signedUrl = await getSignedUrl(storagePath, 'uploads');

                newImagesForDB.push(storagePath);
                newImagesForUI.push(signedUrl || img);
            } catch (e) {
                console.error("Upload failed for image", e);
                throw new Error("Image Upload Failed: " + e.message);
            }
        } else {
            const extractedPath = extractPathFromUrl(img);
            if (extractedPath) {
                newImagesForDB.push(extractedPath);
            } else {
                newImagesForDB.push(img);
            }
            newImagesForUI.push(img);
        }
    }

    // 2. Process Audio (with robust distinct error handling)
    const newAudioForUI = [];
    const newAudioForDB = [];

    for (const audio of (entryState.audioNotes || [])) {
        let blobToUpload = null;
        let isNewUpload = false;

        // Check if it's a raw Blob object (passed from App.jsx)
        if (audio instanceof Blob) {
            blobToUpload = audio;
            isNewUpload = true;
        }
        // Check if it's a Blob URL (string)
        else if (typeof audio === 'string' && audio.startsWith('blob:')) {
            try {
                const res = await fetch(audio);
                if (!res.ok) throw new Error(`Fetch status: ${res.status}`);
                blobToUpload = await res.blob();
                if (blobToUpload.size === 0) throw new Error("Empty audio recording");
                isNewUpload = true;
            } catch (e) {
                console.error("Local audio fetch failed", e);
                throw new Error("Local Audio Error: " + e.message);
            }
        }

        if (isNewUpload && blobToUpload) {
            try {
                const path = getPath('audio') + '.webm';
                const storagePath = await uploadToSupabase(blobToUpload, path, 'uploads');
                const signedUrl = await getSignedUrl(storagePath, 'uploads');

                newAudioForDB.push(storagePath);
                // Return signed URL for UI, or fallback to a local object URL if needed (though signed is preferred)
                newAudioForUI.push(signedUrl || URL.createObjectURL(blobToUpload));
            } catch (e) {
                console.error("Supabase audio upload failed", e);
                throw new Error("Supabase Upload Error: " + e.message);
            }
        } else {
            // Existing remote path or URL
            const extractedPath = extractPathFromUrl(audio);
            if (extractedPath) {
                newAudioForDB.push(extractedPath);
            } else {
                newAudioForDB.push(audio);
            }
            newAudioForUI.push(audio);
        }
    }

    const cleanData = {
        ...entryState,
        images: newImagesForDB,
        audioNotes: newAudioForDB,
    };

    await saveEntry(dateKey, cleanData);

    return { images: newImagesForUI, audioNotes: newAudioForUI };
};
