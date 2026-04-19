# Supabase Google Auth Setup Guide

Follow these steps to enable Google Sign-In for your application. Since I don't have access to your Supabase dashboard, you will need to perform these steps manually.

## 1. Google Cloud Console (Obtain Credentials)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Search for **"APIs & Services"** > **"OAuth consent screen"**.
   - Choose **External** user type.
   - Fill in the required app information (App name, support email, developer info).
   - Under **Scopes**, add `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
4. Go to **"Credentials"** > **"Create Credentials"** > **"OAuth client ID"**.
   - Application type: **Web application**.
   - Name: `Event Volunteer App`.
   - **Authorized redirect URIs**: 
     - You need to get this from your Supabase Dashboard (see Step 2 below). It will look like: `https://bwvhboykreegfglnbsdk.supabase.co/auth/v1/callback`.
5. Copy your **Client ID** and **Client Secret**.

## 2. Supabase Dashboard (Enable Provider)

1. Go to your [Supabase Dashboard](https://app.supabase.com/).
2. Select your project: `bwvhboykreegfglnbsdk`.
3. Go to **Authentication** > **Providers**.
4. Find **Google** and expand it.
5. Toggle **Enable Google**.
6. Paste the **Client ID** and **Client Secret** you copied from the Google Cloud Console.
7. Click **Save**.
8. (Optional) Copy the **Redirect URL** from this page and ensure it matches what you entered in the Google Cloud Console earlier.

## 3. Verify Database Table

Ensure your `profiles` table has a `role` column that allows `NULL` values initially, as Google users won't have a role until they select one in our app.

---

### What I've implemented:
- **Role Selection**: New Google users will be automatically redirected to a premium selection page to choose "Volunteer" or "Organizer".
- **Database Persistence**: Every user (OTP or Google) is now stored in your Supabase `profiles` table. Mock users have been removed.
- **Organizer Registration**: A new "Create Account" link is now available on the Organizer login page.
