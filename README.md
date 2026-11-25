# Skite Prime - Enterprise Suite CRM

Skite Prime is a high-velocity, modern Multi-Tenant CRM and Enterprise Suite featuring Lead Management, GST-compliant Invoicing, HR Management, Student Lifecycle, Dynamic Module Permissions, and Business Analytics.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Axios, jsPDF
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, Cloudinary

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env # Configure your MongoDB & environment variables
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Project knowledge map

Graphify indexes the source locally. Open `graphify-out/graph.html` for the visual map or run a focused query from the repo root.

```powershell
.\graphify.ps1 update .
.\graphify.ps1 query "How does invoice creation flow through the backend?" --budget 1000
```

- **After a batch of edits, a pull, or a branch switch:** run `.\graphify.ps1 update .`.
- **While editing manually:** run `.\graphify.ps1 watch .` in a separate terminal for automatic updates on saved code changes. Stop it with Ctrl+C.
- **After removing or renaming code:** if Graphify rejects a smaller graph, run `.\graphify.ps1 update . --force`.

On another machine, install the [official `graphifyy` package](https://github.com/Graphify-Labs/graphify#install). If you install it through `uv tool` or `pipx`, use `graphify` directly in place of `.\graphify.ps1`.

## Robotriq migration rehearsal

Run the reconciliation and import preview from the repository root. The environment files supply the legacy `Robotriq` and destination MongoDB connections. Both commands below are read-only. The import preview prints collection counts and a `planId` for the proposed records and mappings.

```powershell
node backend/scripts/reconcile_robotriq.cjs $legacyEnv $skiteEnv
node backend/scripts/rehearse_robotriq_import.cjs $legacyEnv $skiteEnv
```

For a rehearsal, use a separate loopback MongoDB replica set and a `skitecrm_robotriq_rehearsal` database. Seed it with the Robotriq tenant and the SkiteCRM fields needed for identity and reference matching. Preview against that database and use the plan ID returned for that rehearsal target.

```powershell
node backend/scripts/rehearse_robotriq_import.cjs $legacyEnv $rehearsalEnv
node backend/scripts/rehearse_robotriq_import.cjs $legacyEnv $rehearsalEnv --apply-rehearsal $planId
node backend/scripts/rehearse_robotriq_import.cjs $legacyEnv $rehearsalEnv
```

Rehearsal writes use one transaction and verify the stored records before commit. The repeat preview should report zero pending inserts. Review unmatched accounts and missing historical references separately from insert conflicts and validation errors. Preserve existing account roles until an administrator confirms any changes.

For an authorized one-time production copy, use `--apply-robotriq-copy` with the plan ID from a fresh preview against the SkiteCRM Atlas destination. It inserts records into the dedicated Robotriq collections in one verified transaction. The legacy CRM can stay online. Entries made after the copy require a separate reconciliation. Copying the data is independent of deploying the application or switching users to SkiteCRM. Configure `ROBOTRIQ_STUDENT_JWT_SECRET` with a separate secret of at least 32 characters on the deployed backend before verifying Student Login.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
