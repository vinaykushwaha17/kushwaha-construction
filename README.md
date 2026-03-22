# Kushwaha Construction - Workforce Management System

A complete PWA for managing construction site workers, attendance, advances, and salaries.

## Features
- Worker management (add/edit/delete)
- Daily attendance marking (bulk or individual)
- Advance/expense tracking
- Weekly salary calculation with advance deductions
- Payment processing and history
- Reports with CSV export
- PWA — installable on mobile/desktop

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Setup

```bash
# Clone or navigate to project
cd kushwaha-construction

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and JWT secret

# Seed the admin account (first time only)
# After starting the app, visit:
# http://localhost:3000/api/auth/seed

# Start development server
npm run dev
```

### 3. Login
- URL: http://localhost:3000/login
- Username: `admin`
- Password: `admin123`

> Change these in `.env.local` before seeding.

### 4. Build for production
```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens (use a strong random string) |
| `ADMIN_USERNAME` | Initial admin username |
| `ADMIN_PASSWORD` | Initial admin password |

## PWA Installation
- On mobile (Chrome/Safari): tap the browser menu → "Add to Home Screen"
- On desktop (Chrome): click the install icon in the address bar

## Folder Structure
```
├── app/
│   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── workers/        # Worker management
│   │   ├── attendance/     # Daily attendance
│   │   ├── expenses/       # Advances & expenses
│   │   ├── salary/         # Salary calculation
│   │   ├── payments/       # Payment processing
│   │   └── reports/        # Reports & CSV export
│   ├── api/                # API routes
│   └── login/              # Login page
├── components/             # Reusable UI components
├── lib/                    # Utilities (db, auth, api client)
├── models/                 # MongoDB/Mongoose schemas
├── public/                 # Static assets + PWA manifest
└── store/                  # Zustand state management
```

## Salary Formula
```
Gross Salary = Present Days × Daily Wage
Net Salary   = Gross Salary − Total Advances
```
Half-day attendance counts as 0.5 days.
