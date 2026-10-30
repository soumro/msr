# Master Scholarship Register — Developer Guide

This file is your manual. Everything you need to modify the app is here.

---

## 1. Overview

A **Laravel 13 + React (Vite) monolith** for managing student scholarships. Single Laravel app — React lives in `resources/js/`, Vite bundles it, Laravel serves one Blade shell at any URL.

**What it does:**

- Manage scholarship records (student, scheme, donor, installments, cheque, received date)
- Detect duplicate aid (same student under multiple schemes)
- Detect duplicate cheques (fraud signal)
- Workflow for renewals (due → submitted → approved/rejected)
- Application tracking + promote approved → scholarship
- Financial reconciliation with donor expected vs received
- 5 report views (Grouped, Summary, Student-wise, Year-wise, Department-wise)
- Bulk CSV import (per-scholarship or full format)
- Document attachments (per scholarship + per announcement)
- Audit log (every change tracked)
- Backups (Artisan command + download UI)
- Role-based access (admin / committee / finance / viewer)

---

## 2. Tech Stack

| Layer    | Tool                                                  |
| -------- | ----------------------------------------------------- |
| Backend  | PHP 8.3+, Laravel 13                                  |
| Frontend | React 19, React Router 7, TanStack Query 5, Axios     |
| Styling  | Tailwind CSS v4 (`@tailwindcss/vite` plugin)          |
| Bundler  | Vite 7                                                |
| Database | MySQL 8+                                              |
| Auth     | Laravel Breeze (Blade login) + Sanctum (stateful API) |
| Dev host | Laragon at `http://msr.test`                          |

---

## 3. Quick Start

```bash
# Terminal 1 — Laravel (Laragon Apache serves http://msr.test — no command needed)

# Terminal 2 — Vite dev server (keep running)
cd C:\laragon\www\msr
npm run dev

# Open browser
http://msr.test
```

msr/
├── app/
│ ├── Console/Commands/
│ │ ├── BackupDatabase.php
│ │ └── MigrateInstallments.php
│ ├── Http/
│ │ ├── Controllers/Api/
│ │ │ ├── AnnouncementController.php
│ │ │ ├── AnnouncementDocumentController.php
│ │ │ ├── ApplicationController.php
│ │ │ ├── AuditLogController.php
│ │ │ ├── BulkImportController.php
│ │ │ ├── DashboardController.php
│ │ │ ├── DuplicateCheckController.php
│ │ │ ├── InstallmentController.php
│ │ │ ├── LookupController.php
│ │ │ ├── ProfileController.php
│ │ │ ├── ReconciliationController.php
│ │ │ ├── RenewalController.php
│ │ │ ├── ReportsController.php
│ │ │ ├── ScholarshipController.php
│ │ │ ├── ScholarshipDetailController.php
│ │ │ └── SettingController.php
│ │ └── Middleware/RequireRole.php
│ ├── Models/
│ │ ├── Concerns/Auditable.php
│ │ ├── Announcement.php
│ │ ├── AnnouncementDocument.php
│ │ ├── Application.php
│ │ ├── AuditLog.php
│ │ ├── DuplicateFlag.php
│ │ ├── ImportBatch.php
│ │ ├── Installment.php
│ │ ├── Lookup.php
│ │ ├── ReceivedAmount.php
│ │ ├── Scholarship.php
│ │ ├── ScholarshipDocument.php
│ │ ├── ScholarshipNote.php
│ │ ├── Setting.php
│ │ └── User.php
│ ├── Services/DuplicateAidDetector.php
│ └── Providers/AppServiceProvider.php
├── bootstrap/app.php ← route file registration + middleware aliases
├── database/
│ ├── migrations/
│ └── seeders/
├── resources/
│ ├── css/app.css ← Tailwind import + custom CSS
│ ├── js/
│ │ ├── main.jsx ← entry (mounts React)
│ │ ├── App.jsx ← router + providers
│ │ ├── components/
│ │ │ ├── ApplicationModal.jsx
│ │ │ ├── AnnouncementDocumentsModal.jsx
│ │ │ ├── Charts.jsx
│ │ │ ├── InstallmentSection.jsx
│ │ │ ├── Layout.jsx
│ │ │ ├── LookupSelect.jsx
│ │ │ ├── Pagination.jsx
│ │ │ ├── ScholarshipModal.jsx
│ │ │ ├── StatusBadge.jsx
│ │ │ ├── StudentDrawer.jsx
│ │ │ └── StudentDetailModal.jsx
│ │ ├── context/
│ │ │ ├── AuthContext.jsx
│ │ │ ├── ConfirmContext.jsx
│ │ │ ├── SettingsContext.jsx
│ │ │ └── ToastContext.jsx
│ │ ├── hooks/useLookups.js
│ │ ├── pages/
│ │ │ ├── AppSettings.jsx
│ │ │ ├── Applications.jsx
│ │ │ ├── AuditLogs.jsx
│ │ │ ├── Dashboard.jsx
│ │ │ ├── Duplicates.jsx
│ │ │ ├── Import.jsx
│ │ │ ├── Lookups.jsx
│ │ │ ├── Profile.jsx
│ │ │ ├── Reconciliation.jsx
│ │ │ ├── Register.jsx
│ │ │ ├── Renewals.jsx
│ │ │ ├── Support.jsx
│ │ │ └── YearEndReport.jsx
│ │ └── services/
│ │ ├── api.js ← axios instance
│ │ └── scholarships.js ← all API calls
│ └── views/
│ ├── app.blade.php ← SPA shell
│ ├── welcome.blade.php
│ ├── layouts/guest.blade.php ← login/register shell
│ └── auth/\*.blade.php
├── routes/
│ ├── api.php ← all API routes
│ ├── auth.php ← Breeze auth routes
│ ├── console.php ← Artisan scheduler
│ └── web.php ← SPA catch-all
└── vite.config.js


