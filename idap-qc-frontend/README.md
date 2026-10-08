# IDAP QC Reporting Frontend

Mobile-first frontend for capturing site quality issues, building inspection reports, reviewing submissions, and monitoring QC metrics.

## Start locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Mock mode is enabled by default, so the frontend is usable before the separate backend is available.

## Architecture

- Next.js App Router and TypeScript
- Feature-first modules under `src/features`
- TanStack Query for backend state
- React Hook Form and Zod for forms and validation
- Zustand for report-builder ordering state
- Typed services under `src/services`; UI code does not call backend endpoints directly
- DTO/domain separation can be expanded in `src/types` and `src/mappers` as the backend contract stabilizes

Set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_URL` to connect the real API. Authentication must use secure backend/session cookies; do not store bearer tokens in browser storage.

## Implemented workflow slices

- Responsive workspace navigation and project selection
- Dashboard metrics
- Issue register, detail, mobile issue capture, generic-issue autofill, and photo selection
- Report register, report metadata creation, section/observation builder, preview, and workflow actions
- Generic issue catalogue and administration entry points

The backend remains authoritative for role checks, report transitions, report numbering, issue/report scope, image storage, audit history, and generated documents.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
