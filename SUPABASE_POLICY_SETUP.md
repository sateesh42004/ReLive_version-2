# Supabase Storage Policy Setup (Crucial!)

Since we cannot use Cloud Functions securely without billing, we must allow the frontend to upload directly.

## 1. Create Bucket
In your Supabase Dashboard, go to **Storage** -> **New Bucket**.
- Name: `uploads`
- **Public**: OFF (Ensure the toggle is grey/off)

## 2. Add Policy (Allow Uploads)
Go to **Storage** -> **Policies** -> `uploads` bucket -> **New Policy** -> **For full customization**.

- **Policy Name**: `Allow Anon Uploads`
- **Target Roles**: Check `anon` (or leave empty for all)
- **Allowed Operations**: Check `INSERT` and `SELECT`
- **Policy Definition (USING expression)**: `true` (or confine to folder if you want `bucket_id = 'uploads'`)
- **Review** -> **Save Policy**

This allows anyone with your Anon Key (which is public in the frontend) to upload files. While the bucket is "Private" (no public links), the upload endpoint is technically accessible.

## 3. Usage
- The app will now upload directly using `supabase.storage.from('uploads').upload(...)`.
- The app will generate signed URLs for viewing.
