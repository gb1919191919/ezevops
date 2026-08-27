# FleetOps | Enterprise Multi-Hub EV Fleet Command & Maintenance Platform

A centralized internal operational platform for multi-hub electric vehicle (EV) fleet management, maintenance lifecycle tracking, multi-location spare parts inventory staging, multi-tiered approval workflows, and immutable audit logging.

Built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, RLS, Storage)**.

---

## 🚀 Key Features Implemented

### 1. Dynamic RBAC & Additive Multi-Role Architecture
- **Additive Permission Matrix ($\text{Role}_A \cup \text{Role}_B$):** Users can hold multiple roles simultaneously (e.g. Manager + RSA), dynamically unlocking the combined set of permissions.
- **Roles Implemented:**
  - **Owner (Admin):** Full system access, approval overrides, refund settlements, master audits.
  - **Manager:** Hub assignment, task allocation, job card approvals, spare part sign-offs, vehicle state approvals, refund verification.
  - **RSA (Roadside Assistance):** Field breakdown reporting, towing/battery swap logs, roadside repair execution.
  - **Mechanic:** Maintenance log entry, defect diagnosis, spare parts allocation requests, digital vehicle checklist audits.
- **Live Role Switcher:** Switch or combine roles directly from the header to test and preview permissions in real time.

---

### 2. Operational Invariants & Two-Phase Staging Engines

#### A. Two-Phase Spare Parts Staging
- **Formula:**
  $$\text{Available Stock} = \text{Physical Stock} - \text{Pending Allocated Stock}$$
- **UI Display:** `Available (Physical)` (e.g. `10 (14)`).
- **Workflow:**
  1. **Mechanic Part Request:** Staged on open Job Card $\rightarrow$ `pending_allocated_stock` increments, Physical stock remains unchanged.
  2. **Manager Job Approval:** Manager clicks "Approve" $\rightarrow$ `physical_stock` decrements by quantity, `pending_allocated_stock` decrements by quantity.
  3. **Low-Stock Alert Trigger:** Automatically flags items in red when `Available Stock < min_threshold`.

#### B. Two-Phase Vehicle Status Staging
- **Workflow:**
  1. Field staff submits a transition request $\rightarrow$ `pending_status = 'UNDER_REPAIR'` with a mandatory reason.
  2. UI displays `AVAILABLE (Pending: UNDER_REPAIR)` with an animated badge.
  3. Manager/Owner Approvals Desk verifies and commits the transition $\rightarrow$ `current_status = UNDER_REPAIR` and `pending_status = null`.

#### C. Zero Hard Deletes & Immutable Audit Trail
- SQL `DELETE` is blocked via triggers. Soft deletes set `is_active = FALSE`.
- Every mutation records a JSON diff snapshot into `audit_logs` with the performing user, timestamp, and pre/post-mutation states.

---

### 3. Screen Breakdown & Workflows

1. **Executive Command Center (`/`):**
   - Fleet state metrics, charging port utilization %, active regional hubs, low stock alerts, and quick action launchpad.
2. **Fleet Master Sheet (`/fleet`):**
   - Filterable EV grid & table with search across VIN, plate number, key tags, and models.
   - Deep-Dive Modal with 4 tabs: Overview & Telemetry, Interlinked Job Cards, Lifetime Parts Consumed & Costs, and Vehicle Lifecycle Audit Logs.
3. **Approvals Desk Priority Queue (`/approvals`):**
   - Dedicated review center with celebration effects (`canvas-confetti`) for Pending Job Cards, Staged EV Transitions, and Customer Disputes.
4. **Spare Parts Matrix (`/inventory`):**
   - Cross-hub stock matrix displaying `Available (Physical)` counts, inter-hub stock transfers, shelf adjustments, and low-threshold highlights.
5. **Maintenance Engine (`/job-cards`):**
   - Mobile-optimized multi-step wizard:
     1. Select Vehicle ➔ 2. 10-Point Checklist & Camera Photo Uploads ➔ 3. Spare Parts Staging ➔ 4. Review & Submit.
6. **Hierarchical Objective & Task Tracker (`/tasks`):**
   - Top-level Hub Objectives containing nested tasks with priority badges, vehicle links, and one-tap status cycling (`TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `REVIEW` $\rightarrow$ `COMPLETED`).
7. **Customer Financial Operations (`/refunds`):**
   - Log ride disputes with proof attachments; Manager Verification $\rightarrow$ Owner Settlement Payout workflow.
8. **Multi-Location Hubs Directory (`/hubs`):**
   - Hub POCs, Day/Night guard contacts, charging bay capacities, and assigned vehicle counts.
9. **Field Optical Scanner (`/scanner`):**
   - Mobile camera QR scan simulator and instant plate number lookup for rapid field diagnostics.
10. **Audit Trail Explorer (`/audit`):**
    - Searchable append-only audit trail with an interactive visual JSON diff modal.
11. **Settings & Architecture (`/settings`):**
    - Supabase connection details, dynamic RBAC matrix explorer, and state reset controls.

---

## 🗄️ Database Setup & SQL Migrations

The full PostgreSQL database definitions are provided in:
- `supabase/schema.sql`: Table definitions, Enums, Zero-Hard-Delete triggers, Audit triggers, and RLS policies.
- `supabase/seed.sql`: Realistic seed data with 4 regional hubs, 14 EVs in various states, spare parts catalog, job cards, refund claims, objectives, and audit logs.

### Applying to Supabase:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/yliozdsnqnfjkpcuctwe).
2. Navigate to **SQL Editor**.
3. Paste and run `supabase/schema.sql`.
4. Paste and run `supabase/seed.sql`.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).
