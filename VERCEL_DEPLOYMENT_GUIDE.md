# EzEv Ops - Vercel Deployment & Supabase Configuration Guide

This step-by-step guide walks you through deploying **EzEv Ops** to [Vercel](https://vercel.com) and configuring your [Supabase](https://supabase.com) project for production authentication.

---

## 1. Environment Variables for Vercel

When importing your project into Vercel, copy and paste the following environment variables under **Project Settings > Environment Variables** (Apply to **Production**, **Preview**, and **Development**):

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yliozdsnqnfjkpcuctwe.supabase.co` | Supabase API Endpoint (Browser client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI` | Public Anon/Publishable Key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI` | Publishable Key alias |
| `SUPABASE_URL` | `https://yliozdsnqnfjkpcuctwe.supabase.co` | Backend Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI` | Public Key for server routes |
| `SUPABASE_SECRET_KEY` | `sb_secret_deAPQXRdEYMGvqZBXf6EWw_FYqMA5-h` | Secret Admin Key (Bypasses RLS for backend sync & seed) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_deAPQXRdEYMGvqZBXf6EWw_FYqMA5-h` | Service Role Key alias |
| `SUPABASE_JWKS_URL` | `https://yliozdsnqnfjkpcuctwe.supabase.co/auth/v1/.well-known/jwks.json` | JWKS Token Verification Endpoint |

---

## 2. Step-by-Step Vercel Deployment

### Step 2.1: Import GitHub Repository
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New…** > **Project**.
3. Select and import the repository: **`gb1919191919/ezevops`**.

### Step 2.2: Configure Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (leave default)
- **Build Command**: `npm run build` (or Next.js default `next build`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 2.3: Add Environment Variables
1. Expand the **Environment Variables** accordion on the Vercel import screen.
2. Add all 8 variables listed in **Section 1**.
3. Click **Deploy**.

---

## 3. Mandatory Supabase Dashboard Configuration

For Magic Link / Email OTP authentication to redirect back to your live Vercel domain instead of `localhost`, you **must** update the URL configuration in your Supabase project:

### Step 3.1: Configure Site URL & Redirect URLs
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/yliozdsnqnfjkpcuctwe).
2. Navigate to **Authentication** (sidebar) > **URL Configuration**.
3. **Site URL**:
   - Change from `http://localhost:3000` to your Vercel production domain:
   - Example: `https://ezevops.vercel.app` (or your custom domain).
4. **Redirect URLs (Allow list)**:
   - Click **Add URL** and add the following wildcard patterns:
     - `https://*.vercel.app/**`
     - `https://ezevops.vercel.app/**`
     - `http://localhost:3000/**` (keeps local development working)
5. Click **Save Changes**.

---

### Step 3.2: Verify Email Auth Provider
1. Go to **Authentication** > **Providers** > **Email**.
2. Ensure **Enable Email provider** is turned **ON**.
3. Ensure **Confirm email** is enabled (or disabled if you want instant Magic Link sign-ins).
4. *(Recommended for Production)*: In **Project Settings** > **Authentication** > **SMTP Settings**, configure a custom SMTP provider (e.g. Resend, SendGrid, Amazon SES) to avoid Supabase's default rate limit of 3-4 emails per hour.

---

## 4. Verification & First Login

Once deployed on Vercel:

1. Open your live Vercel URL (e.g. `https://ezevops.vercel.app`).
2. You will be automatically prompted to log in by `AuthGuard`.
3. Enter Super Admin email: **`bhuvnesh3568@gmail.com`**.
4. Click **Send Secure Magic Link**.
5. Check your email inbox, click the link, and you will be logged into EzEv Ops with **Super Admin (Owner)** privileges.

---

## 5. Summary of Architecture & Security

- **Database**: Remote Supabase PostgreSQL (`yliozdsnqnfjkpcuctwe`) with 21 tables populated with real Mumbai operations data.
- **Row-Level Security (RLS)**: Public/anonymous queries are blocked (0 rows leaked). All requests require a valid Supabase JWT.
- **Role-Based Access Control (RBAC)**: Enforced both at the PostgreSQL database level and Next.js frontend navigation.
- **Realtime**: Live multi-user synchronization enabled on vehicles, refunds, team notes, and job cards.
