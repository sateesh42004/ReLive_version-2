# Firebase Cloud Functions Setup (Trusted Backend)

To enable the secure, private Supabase storage flow, you need to deploy these Firebase Cloud Functions.

## 1. Initialize Cloud Functions

Run this in your project root:

```bash
firebase init functions
```

- Select **JavaScript** (or TypeScript if you prefer).
- Install dependencies when asked (`npm install`).

## 2. Update `functions/index.js`

Replace the contents of `functions/index.js` with the code below.

```javascript
const functions = require("firebase-functions");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase Admin Client
// TIP: Use environment variables for keys in production! 
// e.g. functions.config().supabase.url
const supabaseUrl = "YOUR_SUPABASE_URL"; 
const supabaseServiceRoleKey = "YOUR_SUPABASE_SERVICE_ROLE_KEY"; // MUST be Service Role, not Anon

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generate a Signed Upload URL.
 * Allows the frontend to upload a SINGLE file to a specific path without exposing write permissions.
 */
exports.getSignedUploadUrl = functions.https.onCall(async (data, context) => {
  // 1. Security Check: User must be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { path, bucket = "uploads" } = data;
  
  // 2. Validate Path (Optional but recommended)
  // Ensure user is only writing to their own folder?
  if (!path.startsWith(context.auth.uid)) {
     throw new functions.https.HttpsError("permission-denied", "Can only upload to your own folder.");
  }

  try {
    // 3. Generate Signed Upload URL
    // syntax: createSignedUploadUrl(path)
    const { data: urlData, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) throw error;

    return { signedUrl: urlData.signedUrl, path: urlData.path };
  } catch (err) {
    console.error("Upload URL Error:", err);
    throw new functions.https.HttpsError("internal", "Failed to generate upload URL");
  }
});

/**
 * Generate a Signed Download URL.
 * Allows the frontend to view a private file securely.
 */
exports.getSignedDownloadUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { path, bucket = "uploads" } = data;

  try {
    // Generate URL valid for 1 hour
    const { data: urlData, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) throw error;

    return { signedUrl: urlData.signedUrl };
  } catch (err) {
    console.error("Download URL Error:", err);
    throw new functions.https.HttpsError("internal", "Failed to generate download URL");
  }
});
```

## 3. Install Supabase SDK in Functions

Navigate to the `functions` folder and install the SDK:

```bash
cd functions
npm install @supabase/supabase-js
```

## 4. Deploy

Deploy your functions to Firebase:

```bash
firebase deploy --only functions
```

## 5. Security Note

- **Bucket Policy**: Ensure your Supabase `uploads` bucket has **NO policies** allowing `anon` access. It should differ to the Service Role (which has bypass access by default) used by these functions.
