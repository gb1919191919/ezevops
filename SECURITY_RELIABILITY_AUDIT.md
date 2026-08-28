# 🔒 EzEv Ops — Full Security, Reliability & Data Backup Audit Report

> **Audit Date:** 28 August 2026
> **Platform:** EzEv Ops (fleet-ops-platform)
> **Stack:** Next.js 14 · Supabase (Auth + Postgres + Storage + Realtime) · Zustand · TypeScript
> **Auditor:** Automated Codebase Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vulnerability Assessment](#2-vulnerability-assessment)
   - [CRITICAL Findings](#21-critical-findings)
   - [HIGH Findings](#22-high-findings)
   - [MEDIUM Findings](#23-medium-findings)
   - [LOW / INFO Findings](#24-low--info-findings)
3. [API Calling & Reliability Issues](#3-api-calling--reliability-issues)
4. [Data Backup & Security](#4-data-backup--security)
5. [Authentication & Authorization Issues](#5-authentication--authorization-issues)
6. [Database & RLS Security Analysis](#6-database--rls-security-analysis)
7. [Frontend Reliability & Error Handling](#7-frontend-reliability--error-handling)
8. [Recommendations Summary](#8-recommendations-summary)
9. [Severity Matrix](#9-severity-matrix)

---

## 1. Executive Summary

The EzEv Ops platform is a Next.js 14 application backed by Supabase, managing EV fleet operations, maintenance, inventory, approvals, and team communications. This audit identifies **6 CRITICAL**, **8 HIGH**, **10 MEDIUM**, and **6 LOW/INFO** findings across security, reliability, and data backup domains.

### Key Risk Areas

| Area | Risk Level | Summary |
|------|-----------|---------|
| **Authentication** | 🔴 CRITICAL | No server-side middleware; auth guard is client-only and bypassable |
| **Secrets Exposure** | 🔴 CRITICAL | Hardcoded Supabase keys in source code; service-role key exposed in client-reachable fallback chain |
| **API Security** | 🔴 CRITICAL | Seed endpoint allows any authenticated user to overwrite production database |
| **Data Backup** | 🟠 HIGH | No automated server-side backup; only client-side JSON export exists |
| **Calling Reliability** | 🟠 HIGH | No retry logic, no offline handling, silent error swallowing everywhere |
| **RLS Policies** | 🟡 MEDIUM | Several tables have overly permissive INSERT/UPDATE policies |
| **Frontend Safety** | 🟡 MEDIUM | No error boundaries, no rate limiting on login attempts |

---

## 2. Vulnerability Assessment

### 2.1 CRITICAL Findings

---

#### CRIT-01: No Next.js Middleware — Server-Side Auth Bypass

**File:** Missing `src/middleware.ts` or root `middleware.ts`
**Severity:** 🔴 CRITICAL

**Problem:**
The application has **no Next.js middleware file**. All authentication is handled exclusively by the client-side `AuthGuard` component in [AuthGuard.tsx](file:///home/bhuvnesh/Desktop/ops/src/components/auth/AuthGuard.tsx). This means:

- Any server-rendered page or API route can be accessed by unauthenticated users by directly hitting the URL
- The `AuthGuard` does a client-side redirect to `/login`, but the page HTML/data has already been sent to the browser
- Bots and scrapers can access all page content without authentication
- Server Components can be rendered without session verification

**Impact:** Any unauthenticated user can access protected pages by disabling JavaScript or inspecting the initial HTML response. API routes at `/api/supabase/status` only check auth server-side, but page routes have no server-side protection.

**Fix:** Create a `middleware.ts` at the project root:
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handlers */ } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

---

#### CRIT-02: Hardcoded Supabase Keys in Source Code

**Files:**
- [client.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/client.ts#L3-L7) — Anon key hardcoded as fallback
- [admin.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/admin.ts#L8-L12) — Service role key fallback chain includes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [SettingsPage.tsx](file:///home/bhuvnesh/Desktop/ops/src/components/settings/SettingsPage.tsx#L593) — Anon key displayed in UI

**Severity:** 🔴 CRITICAL

**Problem:**
The Supabase URL and anon key are hardcoded as fallback values directly in source code:

```typescript
// client.ts line 3
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yliozdsnqnfjkpcuctwe.supabase.co';
export const supabaseAnonKey = ... || 'sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI';
```

While anon keys are designed to be public, hardcoding them means:
- They cannot be rotated without a code deployment
- Anyone with access to the repository permanently has the project URL
- The Settings page renders the actual key in the UI

More critically, the **admin client** at [admin.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/admin.ts#L8-L12) falls back through `SUPABASE_SECRET_KEY` -> `SUPABASE_SERVICE_ROLE_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> `''`, meaning if server env vars are misconfigured, the admin client silently degrades to using the anon key instead of failing loudly.

**Impact:** Key rotation becomes impossible without code change; misconfigurations could silently create an admin client with wrong privileges.

**Fix:** Remove all hardcoded key fallbacks. Use strict environment variable validation at startup:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
```

---

#### CRIT-03: Seed API Allows Any Authenticated User to Overwrite Database

**File:** [seed/route.ts](file:///home/bhuvnesh/Desktop/ops/src/app/api/supabase/seed/route.ts#L26-L43)
**Severity:** 🔴 CRITICAL

**Problem:**
The `/api/supabase/seed` POST endpoint accepts requests from **any authenticated user**, not just owners/admins:

```typescript
// seed/route.ts line 32-42
if (!isAuthorizedSecret) {
  const serverClient = createServerSupabaseClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ← Any authenticated user passes this check!
}
```

A regular mechanic or field staff member can call this endpoint and **upsert data across all 16 tables** using the service-role admin client, completely bypassing RLS policies.

**Impact:** Any authenticated user (including the lowest-privilege "mechanic" role) can overwrite fleet data, profiles, roles, vehicles, refunds — the entire production database.

**Fix:** Add explicit owner/admin role check:
```typescript
// Check the user is an owner
const { data: profile } = await serverClient.from('profiles')
  .select('*, profile_roles(roles(code))')
  .eq('auth_user_id', user.id)
  .single();

const isOwner = profile?.profile_roles?.some(pr => pr.roles?.code === 'owner');
if (!isOwner) {
  return NextResponse.json({ error: 'Forbidden: Owner role required' }, { status: 403 });
}
```

---

#### CRIT-04: Hardcoded Super Admin Email Bypass in Auth Hook

**File:** [useSupabaseAuth.ts](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L26-L42)
**Severity:** 🔴 CRITICAL

**Problem:**
The `matchAndSyncProfile` function contains a hardcoded email check that automatically grants the "owner" (Super Admin) role:

```typescript
// line 27
if (normalizedEmail === 'bhuvnesh3568@gmail.com' || normalizedEmail === 'bhuvnesh@ezev.in') {
  // Immediately set as owner with all permissions
  setCurrentUser(ownerProfile);
  setActiveRoles(['owner']);
  return;
}
```

This runs entirely **on the client side**. The role assignment happens in Zustand state, not verified by the server. This means:
1. If anyone creates a Supabase auth account with these emails (e.g., through OTP manipulation or compromised email), they get instant Super Admin
2. The client-side role check can be manipulated via browser dev tools since it's in Zustand state
3. The hardcoded fallback profile (`usr-01`) is used even if the database profile has different roles

**Impact:** Client-side privilege escalation. The hardcoded owner profile bypasses database-stored role assignments entirely.

**Fix:** Remove the hardcoded email check. All role assignments should come from the database:
```typescript
// Always query the database for role assignments
const { data: dbProfile } = await supabase
  .from('profiles')
  .select('*, profile_roles(roles(*))')
  .eq('email', normalizedEmail)
  .single();
```

---

#### CRIT-05: Client-Side RBAC is Completely Bypassable

**Files:**
- [useRBAC.ts](file:///home/bhuvnesh/Desktop/ops/src/hooks/useRBAC.ts) — Client-side permission checks only
- [rbac.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/rbac.ts) — Permission definitions are client-side only
- [appStore.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/store/appStore.ts) — Zustand state stores `activeRoles`

**Severity:** 🔴 CRITICAL

**Problem:**
The entire RBAC system operates exclusively on the client side using Zustand state. A user can:

1. Open browser DevTools console
2. Access `useAppStore.getState().setActiveRoles(['owner'])`
3. Instantly gain Super Admin permissions in the UI

Since there is no server-side middleware and RLS policies are role-aware only for database operations (not application-level permissions), a mechanic could:
- View all audit trails
- Access all governance features
- Export all data
- Modify UI-level permissions

While database writes are protected by RLS policies that check `auth.uid()` against profiles/roles, the **UI access control** and **what data the user can see and interact with** is entirely client-side.

**Impact:** Any authenticated user can escalate their UI privileges to owner/admin level by manipulating client-side state.

**Fix:**
1. Implement server-side permission checks in API routes
2. Add middleware-level role verification
3. Use server components to verify permissions before rendering sensitive pages

---

#### CRIT-06: `getSession()` Used Instead of `getUser()` for Auth Verification

**File:** [useSupabaseAuth.ts](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L106)
**Severity:** 🔴 CRITICAL

**Problem:**
```typescript
// line 106
const { data: { session: currentSession } } = await supabase.auth.getSession();
```

The Supabase documentation explicitly warns:
> "Never trust `getSession()` inside server-side code such as middleware... Use `getUser()` instead to reliably authenticate users."

`getSession()` reads from local storage/cookies and **does NOT validate the JWT with the Supabase server**. A tampered or expired JWT in local storage would still be accepted as valid.

**Impact:** Session hijacking, expired token acceptance, and JWT tampering are all possible.

**Fix:** Replace with `getUser()`:
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

---

### 2.2 HIGH Findings

---

#### HIGH-01: No Security Headers in Next.js Configuration

**File:** [next.config.mjs](file:///home/bhuvnesh/Desktop/ops/next.config.mjs)
**Severity:** 🟠 HIGH

**Problem:**
The Next.js configuration has zero security headers configured. Missing headers include:
- `Content-Security-Policy` (CSP) — No XSS protection
- `X-Frame-Options` — Vulnerable to clickjacking
- `X-Content-Type-Options` — MIME-type sniffing attacks
- `Referrer-Policy` — Referrer leakage
- `Strict-Transport-Security` (HSTS) — No forced HTTPS
- `Permissions-Policy` — No browser feature restrictions

**Impact:** The application is vulnerable to clickjacking, XSS via inline scripts, MIME-type attacks, and referrer data leakage.

**Fix:** Add security headers to `next.config.mjs`:
```javascript
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
```

---

#### HIGH-02: Wildcard Image Hostname Allows Any Remote Image

**File:** [next.config.mjs](file:///home/bhuvnesh/Desktop/ops/next.config.mjs#L5-L10)
**Severity:** 🟠 HIGH

**Problem:**
```javascript
images: {
  remotePatterns: [{ protocol: "https", hostname: "**" }],
},
```

The `hostname: "**"` wildcard allows loading images from **any domain**. This enables:
- Server-Side Request Forgery (SSRF) via Next.js image optimization
- Image-based tracking pixels from untrusted domains
- Potential for image proxy abuse

**Impact:** An attacker could use the Next.js image optimization endpoint as a proxy to access internal network resources.

**Fix:** Restrict to known domains:
```javascript
remotePatterns: [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "*.supabase.co" },
],
```

---

#### HIGH-03: No Rate Limiting on Login Endpoints

**Files:**
- [login/page.tsx](file:///home/bhuvnesh/Desktop/ops/src/app/login/page.tsx) — No rate limiting
- [useSupabaseAuth.ts](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L147-L196)

**Severity:** 🟠 HIGH

**Problem:**
Neither the login page nor the auth hooks implement any rate limiting for:
- Password sign-in attempts (brute force vulnerability)
- Magic link / OTP requests (email bombing)
- Failed authentication tracking

While Supabase has some built-in rate limiting, there is no application-level protection.

**Impact:** Brute force password attacks and email spam via magic link abuse.

**Fix:** Implement client-side rate limiting and lockout:
```typescript
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
```

---

#### HIGH-04: `handle_new_user()` Trigger Has Hardcoded Owner Emails

**File:** [fix_and_optimize.sql](file:///home/bhuvnesh/Desktop/ops/supabase/fix_and_optimize.sql#L11-L13)
**Severity:** 🟠 HIGH

**Problem:**
```sql
IF NEW.email = 'bhuvnesh3568@gmail.com' OR NEW.email = 'bhuvnesh@ezev.in' THEN
    matched_role_id := 'role-01'; -- Super Admin (Owner)
END IF;
```

The database trigger that runs on new user creation hardcodes two emails to receive the Super Admin role. Also, the trigger uses a hardcoded default phone number `'+91 70560 55476'` for all new users.

**Impact:** If either email is compromised or a new auth account is created with those emails, automatic Super Admin access is granted at the database level.

**Fix:** Store admin emails in an `admin_config` table or use a separate admin provisioning flow. Remove the hardcoded phone number fallback.

---

#### HIGH-05: Supabase Sync Silently Swallows All Errors

**File:** [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts)
**Severity:** 🟠 HIGH

**Problem:**
Every single data pull operation in `pullAllTables()` has an empty catch block:
```typescript
try {
  const { data: hubs, error } = await supabase.from('hubs').select('*');
  if (!error && hubs && hubs.length > 0) { /* update store */ }
} catch (e) {
  // Keep baseline  <-- SILENT FAILURE
}
```

This pattern is repeated 13 times (lines 50-211). Similarly, `pushMutation()` silently catches errors.

**Impact:**
- Data loss goes undetected — mutations can fail silently
- Users see stale data without any indication
- Critical operations (refund approvals, vehicle status changes) can fail without notification
- No way to diagnose data synchronization issues

**Fix:** Implement proper error reporting, retry queues, and user-visible sync status indicators.

---

#### HIGH-06: Realtime Subscriptions Don't Handle UPDATE/DELETE for Most Tables

**File:** [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts#L214-L281)
**Severity:** 🟠 HIGH

**Problem:**
The realtime subscription only listens to 5 tables (`vehicles`, `refunds`, `team_notes`, `channel_messages`, `daily_shift_logs`), but the app has 27 tables. For the subscribed tables:

- `vehicles` only handles `UPDATE` (not `INSERT` or `DELETE`)
- `refunds` handles `INSERT` and `UPDATE` (not `DELETE`)
- `team_notes` only handles `INSERT`
- `channel_messages` only handles `INSERT`
- `daily_shift_logs` only handles `INSERT`

Missing: `hubs`, `parts`, `job_cards`, `tasks`, `objectives`, `profiles`, `sops`, etc.

**Impact:** Multi-user collaboration is broken — changes made by one user are not reflected in other users' views until a full page refresh.

---

#### HIGH-07: Persistent State in LocalStorage via Zustand Persist

**File:** [appStore.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/store/appStore.ts#L4)
**Severity:** 🟠 HIGH

**Problem:**
The Zustand store uses `persist` middleware with `localStorage`. This means:
- All application state (including user profile, roles, and potentially sensitive operational data) is stored in the browser's localStorage
- The `activeRoles` and `currentUser` data persists across sessions
- A user could log out but still have their data visible in localStorage
- Shared computers retain sensitive fleet operations data

**Impact:** Data leakage on shared devices. Role information persists and could be used to re-create session state.

**Fix:**
1. Clear localStorage on sign-out
2. Don't persist sensitive fields (roles, user profile, audit logs)
3. Use `sessionStorage` instead for sensitive data
4. Implement `partialize` to exclude sensitive state from persistence

---

#### HIGH-08: Admin Client Falls Back to `'dummy_key_for_build'`

**File:** [admin.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/admin.ts#L14)
**Severity:** 🟠 HIGH

**Problem:**
```typescript
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey || 'dummy_key_for_build', {
```

If the service role key environment variable is not set, the admin client is created with a literal `'dummy_key_for_build'` string. This client is then used in API routes.

**Impact:** Build-time safety net that could mask production misconfigurations. The admin client should fail loudly if credentials are missing.

**Fix:**
```typescript
if (!supabaseSecretKey) throw new Error('SUPABASE_SECRET_KEY is required');
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, { ... });
```

---

### 2.3 MEDIUM Findings

---

#### MED-01: Overly Permissive RLS INSERT Policies

**File:** [secure_rls.sql](file:///home/bhuvnesh/Desktop/ops/supabase/secure_rls.sql)
**Severity:** 🟡 MEDIUM

**Problem:**
Multiple tables allow **any authenticated user** to INSERT records with `WITH CHECK (true)`:
- `charger_logs`, `vehicle_inspections`, `hub_part_stock`, `part_usage_logs`
- `job_cards`, `job_card_parts`, `refunds`, `objectives`, `milestones`
- `tasks`, `chat_channels`, `team_notes`, `audit_logs`

While some of these make sense (any staff can create inspections, job cards), others are problematic:
- **Refunds**: Any authenticated user can create refund claims
- **Objectives**: Any user can create strategic objectives
- **Audit Logs**: Any user can fabricate audit entries

**Impact:** A low-privilege mechanic can create refunds, objectives, and fake audit log entries.

---

#### MED-02: Overly Permissive RLS UPDATE Policies

**File:** [secure_rls.sql](file:///home/bhuvnesh/Desktop/ops/supabase/secure_rls.sql)
**Severity:** 🟡 MEDIUM

**Problem:**
Several tables allow **any authenticated user** to UPDATE any record with `USING (true) WITH CHECK (true)`:
- `objectives`, `milestones`, `tasks`, `task_remarks`, `task_attachments`
- `task_changelog`, `chat_channels`, `team_notes`, `charger_logs`

**Impact:** Any authenticated user can modify any objective, milestone, task, chat channel, or team note — regardless of ownership or role.

---

#### MED-03: No Login Attempt Logging or Audit Trail

**Severity:** 🟡 MEDIUM — Failed and successful login attempts are not logged to the `audit_logs` table.

#### MED-04: Client-Generated IDs for Audit Logs

**File:** [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts#L323)
**Severity:** 🟡 MEDIUM — Audit log IDs use `Date.now()` + `Math.random()`, which are predictable and non-cryptographic.

#### MED-05: No CSRF Protection on Forms

**Severity:** 🟡 MEDIUM — No CSRF tokens on any forms. JWT-based auth provides some protection, but explicit CSRF defense is missing.

#### MED-06: No Input Validation on Supabase Mutations

**File:** [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts#L284-L337)
**Severity:** 🟡 MEDIUM — The `pushMutation` method accepts any `record` object and `table` string with no validation or allowlist.

#### MED-07: Supabase Project ID Exposed in Login Page

**File:** [login/page.tsx](file:///home/bhuvnesh/Desktop/ops/src/app/login/page.tsx#L201)
**Severity:** 🟡 MEDIUM — Project reference ID `yliozdsnqnfjkpcuctwe` is hardcoded and displayed on the login page.

#### MED-08: Default Phone Number Assigned to All New Users

**File:** [fix_and_optimize.sql](file:///home/bhuvnesh/Desktop/ops/supabase/fix_and_optimize.sql#L22)
**Severity:** 🟡 MEDIUM — Owner's personal phone `+91 70560 55476` is used as default for every new user.

#### MED-09: Storage Uploads Use Public Bucket Without Access Control

**File:** [storage.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/storage.ts)
**Severity:** 🟡 MEDIUM — The `ops-media` bucket appears to be public. All uploaded photos are accessible via URL without authentication.

#### MED-10: No File Type/Size Validation on Uploads

**File:** [storage.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/storage.ts#L20)
**Severity:** 🟡 MEDIUM — File extension is extracted from filename (spoofable). No MIME type validation or size limits.

---

### 2.4 LOW / INFO Findings

| # | Issue | File |
|---|-------|------|
| LOW-01 | Unrecognized users get auto-provisioned guest mechanic profile | [useSupabaseAuth.ts:84](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L84) |
| LOW-02 | No password complexity requirements shown to user | [login/page.tsx](file:///home/bhuvnesh/Desktop/ops/src/app/login/page.tsx) |
| LOW-03 | `console.error`/`console.warn` used instead of proper logging | Multiple files |
| LOW-04 | No CSP for dynamically generated PDF export pages | [exportUtils.ts:161](file:///home/bhuvnesh/Desktop/ops/src/lib/exportUtils.ts#L161) |
| LOW-05 | TypeScript `any` types used extensively, reducing type safety | Multiple files |
| LOW-06 | Login page reveals internal architecture details (Supabase, RLS) | [login/page.tsx](file:///home/bhuvnesh/Desktop/ops/src/app/login/page.tsx) |

---

## 3. API Calling & Reliability Issues

### 3.1 No Retry Logic Anywhere

**Severity:** 🟠 HIGH

The entire application has **zero retry logic** for any API call. Every Supabase query in [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts) makes a single attempt and gives up on failure:

```typescript
// Every query follows this pattern:
try {
  const { data, error } = await supabase.from('table').select('*');
  if (!error && data) { /* use data */ }
} catch (e) {
  // Silent failure — no retry
}
```

**Tables affected:** All 13 pull operations in `pullAllTables()`.

**Impact:** Transient network errors cause data to not load, with no recovery mechanism. Users see stale or empty data.

### 3.2 No Offline Support or Service Worker

The application has no:
- Service worker for offline caching
- Offline queue for mutations
- Network status detection
- Optimistic updates that sync when connectivity returns

**Impact:** If a user loses internet while editing data (common in field operations — mechanics in basement parking lots), their changes are silently lost.

### 3.3 No Request Deduplication

The [useSupabaseSync](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseSync.ts) hook can trigger duplicate `pullAllTables()` calls via `refreshSync`.

### 3.4 No Pagination on Data Fetches

All queries in [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts) fetch entire tables without pagination:
```typescript
const { data: vehicles } = await supabase.from('vehicles').select('*');
const { data: messages } = await supabase.from('channel_messages').select('*');
```

**Impact:** Slow page loads, high memory usage, potential browser crashes as data grows. Supabase has a default row limit (1000) which silently truncates results.

### 3.5 No Request Timeout Configuration

No explicit timeouts on Supabase requests. Hanging requests block indefinitely.

### 3.6 Full State Reload on Sync Error

When `initSync()` fails, it's all-or-nothing with no partial recovery or retry of individual tables.

---

## 4. Data Backup & Security

### 4.1 No Automated Server-Side Backup

**Severity:** 🔴 CRITICAL Gap

**Current State:**
The application's only backup mechanism is a **client-side JSON export** function in [exportUtils.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/exportUtils.ts#L320-L361):

```typescript
export function exportFullDatabaseBackup() {
  const state = useAppStore.getState();
  // Downloads a JSON file to the user's browser
}
```

**Problems:**
1. ❌ **Client-side only** — Requires a logged-in user to manually trigger
2. ❌ **From Zustand state, not database** — Exports client-side cached data, may be stale
3. ❌ **No automated schedule** — No daily/weekly backups
4. ❌ **No versioning** — No concept of "latest" vs "historical"
5. ❌ **No offsite storage** — Downloaded to user's local machine
6. ❌ **No point-in-time recovery** — Cannot restore to a specific timestamp
7. ❌ **No backup verification** — No checksum or integrity validation

### 4.2 Supabase Built-in Backup Assessment

Supabase provides automatic daily backups on paid plans:
- Free tier: No automatic backups
- Pro tier: Daily backups, 7-day retention
- There is no evidence in the codebase of any backup configuration or restoration testing

**Recommendation:** Verify your Supabase plan includes automatic backups and implement a backup verification cron.

### 4.3 No Point-in-Time Recovery Strategy

While the `audit_logs` table records data changes, there is no mechanism to reconstruct a table's state at a previous point, rollback changes, or restore accidentally deleted/archived records.

### 4.4 Soft-Delete Not Enforced at Database Level

The [syncService.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/supabase/syncService.ts#L301-L309) converts `delete` to soft-delete in application code, but direct SQL or API calls can still hard-delete. RLS policies allow DELETE for owners/managers.

**Fix:** Add database-level triggers to prevent physical deletion.

### 4.5 No Encryption at Rest for Sensitive Columns

No column-level encryption for PII (phone numbers, emails). No Supabase Vault usage.

### 4.6 Backup Export Includes All Sensitive Data

The `exportFullDatabaseBackup()` exports everything including staff PII, blocked user data, and customer phone numbers with no data masking.

### 4.7 No Data Retention Policy

No mechanism for automatic archival, audit log purging, or GDPR-compliant data deletion.

---

## 5. Authentication & Authorization Issues

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | No server-side middleware for auth | 🔴 CRITICAL | Missing `middleware.ts` |
| 2 | `getSession()` used instead of `getUser()` | 🔴 CRITICAL | [useSupabaseAuth.ts:106](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L106) |
| 3 | Hardcoded Super Admin emails | 🔴 CRITICAL | [useSupabaseAuth.ts:27](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L27) |
| 4 | Client-side RBAC is bypassable | 🔴 CRITICAL | [useRBAC.ts](file:///home/bhuvnesh/Desktop/ops/src/hooks/useRBAC.ts) |
| 5 | No login rate limiting | 🟠 HIGH | [login/page.tsx](file:///home/bhuvnesh/Desktop/ops/src/app/login/page.tsx) |
| 6 | Guest profile auto-provisioning | 🔵 LOW | [useSupabaseAuth.ts:84](file:///home/bhuvnesh/Desktop/ops/src/hooks/useSupabaseAuth.ts#L84) |
| 7 | Persistent roles in localStorage | 🟠 HIGH | [appStore.ts](file:///home/bhuvnesh/Desktop/ops/src/lib/store/appStore.ts) |
| 8 | No session timeout/refresh strategy | 🟡 MEDIUM | — |

---

## 6. Database & RLS Security Analysis

### RLS Coverage Matrix

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| `hubs` | ✅ auth | ✅ owner/mgr | ✅ owner/mgr | ✅ owner only | Good |
| `charger_logs` | ✅ auth | ⚠️ any auth | ⚠️ any auth | ✅ owner/mgr | INSERT/UPDATE too open |
| `profiles` | ✅ auth | ✅ owner or self | ✅ owner or self | ✅ owner only | Good |
| `roles` | ✅ auth | ✅ owner only | ✅ owner only | ✅ owner only | Good |
| `vehicles` | ✅ auth | ✅ owner/mgr | ✅ owner/mgr | ✅ owner only | Good |
| `job_cards` | ✅ auth | ⚠️ any auth | ✅ owner/mgr or assigned | ✅ owner/mgr | INSERT open by design |
| `refunds` | ✅ auth | ⚠️ any auth | ✅ owner/mgr | ✅ owner only | INSERT should be restricted |
| `objectives` | ✅ auth | ⚠️ any auth | ⚠️ any auth | ✅ owner/mgr | UPDATE too open |
| `milestones` | ✅ auth | ⚠️ any auth | ⚠️ any auth | ✅ owner/mgr | UPDATE too open |
| `tasks` | ✅ auth | ⚠️ any auth | ⚠️ any auth | ✅ owner/mgr | UPDATE too open |
| `chat_channels` | ✅ auth | ⚠️ any auth | ⚠️ any auth | ✅ owner/mgr | Both too open |
| `team_notes` | ✅ auth | ⚠️ any auth | ⚠️ any auth | ✅ owner/mgr | UPDATE too open |
| `audit_logs` | ✅ owner only | ⚠️ any auth | ❌ none | ❌ none | INSERT too open (log fabrication) |
| `channel_messages` | ✅ auth | ⚠️ any auth | ✅ sender only | ✅ owner/mgr or sender | Good update policy |

### Key Database Security Concerns

1. **`audit_logs` INSERT is too open** — Any authenticated user can fabricate audit log entries since INSERT uses `WITH CHECK (true)`. Audit logs should only be inserted by triggers or the service role.
2. **No `updated_at` trigger** — Tables rely on client-side timestamp generation, which can be spoofed.
3. **TEXT primary keys with predictable prefixes** — IDs like `'hub-' || uuid_generate_v4()` are predictable in format.

---

## 7. Frontend Reliability & Error Handling

### 7.1 No React Error Boundaries

**Severity:** 🟠 HIGH — Zero Error Boundary components. Any unhandled error crashes the entire app (white screen of death).

### 7.2 No Loading State on Initial Data Sync

The `useSupabaseSync` hook has `syncStatus` but it's not displayed in the UI during the initial 13-table data pull.

### 7.3 No Stale Data Indicator

When the realtime connection drops, users have no indication their data may be stale. No "Last synced at..." indicator.

### 7.4 Memory Growth with Realtime Subscriptions

The realtime subscription appends to arrays without cleanup:
```typescript
useAppStore.setState({ channelMessages: [...channelMessages, payload.new] });
```
Over time, arrays grow unbounded causing memory issues.

### 7.5 No useEffect Cleanup for Sync Requests

The sync initiation (`pullAllTables()`) has no abort mechanism. If the component unmounts during sync, 13 parallel requests continue running uselessly.

---

## 8. Recommendations Summary

### Immediate (Must-Fix within 1 week)

| # | Action | Fixes |
|---|--------|-------|
| 1 | **Create `middleware.ts`** with server-side auth checks | CRIT-01 |
| 2 | **Remove all hardcoded keys** from source code | CRIT-02 |
| 3 | **Restrict seed API to owner-only** | CRIT-03 |
| 4 | **Remove hardcoded Super Admin emails** from auth hook and DB trigger | CRIT-04, HIGH-04 |
| 5 | **Replace `getSession()` with `getUser()`** | CRIT-06 |
| 6 | **Add security headers** in `next.config.mjs` | HIGH-01 |

### Short-Term (Within 1 month)

| # | Action | Fixes |
|---|--------|-------|
| 7 | Implement server-side RBAC verification | CRIT-05 |
| 8 | Add retry logic with exponential backoff | HIGH-05 |
| 9 | Restrict image hostname wildcard | HIGH-02 |
| 10 | Add login rate limiting | HIGH-03 |
| 11 | Tighten RLS INSERT/UPDATE policies | MED-01, MED-02 |
| 12 | Set up automated database backups | Backup 4.1 |
| 13 | Add React Error Boundaries | 7.1 |
| 14 | Clear localStorage on sign-out | HIGH-07 |

### Medium-Term (Within 3 months)

| # | Action | Fixes |
|---|--------|-------|
| 15 | Implement offline support/service worker | 3.2 |
| 16 | Add pagination to data queries | 3.4 |
| 17 | Complete realtime subscriptions for all tables | HIGH-06 |
| 18 | Add file type/size validation on uploads | MED-10 |
| 19 | Switch to private storage buckets | MED-09 |
| 20 | Implement data retention policies | 4.7 |
| 21 | Add Zod validation on mutations | MED-06 |
| 22 | Set up proper logging (Sentry/LogRocket) | LOW-03 |

---

## 9. Severity Matrix

```
┌────────────────────────────────────────────────────────────────┐
│ SEVERITY DISTRIBUTION                                          │
├────────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL   █████████████████████████  6 findings            │
│ 🟠 HIGH       ██████████████████████████████████  8 findings   │
│ 🟡 MEDIUM     ████████████████████████████████████████  10     │
│ 🔵 LOW/INFO   ████████████████████  6 findings                 │
├────────────────────────────────────────────────────────────────┤
│ TOTAL: 30 findings                                             │
│                                                                │
│ By Category:                                                   │
│  • Authentication/Authorization: 8                             │
│  • Data Security/Backup: 7                                     │
│  • API Reliability: 6                                          │
│  • Database/RLS: 5                                             │
│  • Frontend Safety: 4                                          │
└────────────────────────────────────────────────────────────────┘
```

---

> **Note:** This audit is based on static code analysis of the codebase. Runtime testing, penetration testing, and Supabase dashboard configuration review may reveal additional issues not covered here.
