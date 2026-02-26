# 🐝 Bee-Time — QR Attendance Management System

> A full-stack web application for QR-based employee attendance tracking, actively used across **5 real stores**.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## What is Bee-Time?

Bee-Time started as a solution to a real problem — manually tracking shift attendance across multiple store locations was messy and error-prone. I built this from scratch, and it's now the system those stores actually rely on every day.

Employees scan a QR code on their phone to clock in and out. Managers get a real-time dashboard, export attendance reports to Excel, and manage everything from one place.

---

## Features

- **QR Code Clock In/Out** — unique QR per location, scanned via mobile browser
- **Real-time Dashboard** — live attendance status per store and shift
- **Role-based Access** — admin, manager, and employee roles with JWT auth
- **Google OAuth** — sign in with Google account
- **Excel Export** — attendance reports exported with one click (ExcelJS)
- **Email Notifications** — automated alerts via Nodemailer
- **Multi-location Support** — manage multiple stores from a single system
- **Sydney Timezone Handling** — all time calculations in Australia/Sydney

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL (via Prisma ORM) |
| Auth | JWT, Google OAuth (`@react-oauth/google`) |
| QR | `html5-qrcode`, `qrcode`, `@zxing/library` |
| Export | ExcelJS, xlsx |
| Deployment | Vercel (frontend), Render (backend) |

---

## Project Structure

```
src/
├── components/     # React UI components
├── server/         # Express backend (index.ts)
├── config/         # API constants, environment config
scripts/
├── generate-qr.ts  # QR code generation per location
├── admin.ts        # Admin account setup
├── workplace-data.ts
prisma/
└── schema.prisma   # Database schema
```

---

## Getting Started

```bash
# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.development

# Run database migrations
npx prisma migrate dev

# Start development (frontend + backend)
yarn dev        # Frontend (Vite)
yarn server     # Backend (Express)
```

---

## Live Deployment

- Frontend: Vercel
- Backend: Render
- Database: PlanetScale / hosted MySQL

