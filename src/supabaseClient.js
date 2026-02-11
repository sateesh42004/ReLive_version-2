
import { createClient } from '@supabase/supabase-js'

// TODO: data from your Supabase project settings
const supabaseUrl = 'https://ugexywogdaefsbixclum.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZXh5d29nZGFlZnNiaXhjbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Njc5ODQsImV4cCI6MjA4NjI0Mzk4NH0.Ehc5kWLgaVp-bqMkp6yfJKsauk6t_AhypjNw7SxxxCY'

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Uploads a file directly to Supabase Storage using the Anon Key.
 * NOTE: This requires "anon" INSERT/SELECT permissions on the bucket.
 * 
 * @param {Blob|File} file
 * @param {string} path - Relative path (e.g. "user_id/filename.jpg")
 * @param {string} bucket - Bucket name, default is 'uploads'
 * @returns {Promise<string>} - The internal storage path
 */
export const uploadToSupabase = async (file, path, bucket = 'uploads') => {
    const uploadOptions = { upsert: true };
    if (file.type) {
        uploadOptions.contentType = file.type;
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, uploadOptions)

    if (error) {
        console.error("Supabase Upload Error:", error);
        throw error;
    }

    // Return the path (key) to be stored in the database
    return data.path;
}

/**
 * Generates a signed URL using the Anon Key (client-side).
 * NOTE: This requires "anon" SELECT permissions (or public bucket).
 * 
 * @param {string} path - The internal storage path
 * @param {string} bucket - Bucket name, default is 'uploads'
 * @returns {Promise<string|null>} - The signed URL or null if error
 */
export const getSignedUrl = async (path, bucket = 'uploads') => {
    if (!path) return null;
    // If it's already a full URL (legacy or external), return it as is
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    // Generate signed URL valid for 1 hour (3600 seconds)
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

    if (error) {
        console.error("Error creating signed URL:", error);
        return null;
    }

    return data.signedUrl;
}
