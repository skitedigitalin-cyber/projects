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

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
