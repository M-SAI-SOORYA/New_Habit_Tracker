# Daymark Habit Tracker

A polished, mobile-first React habit tracker backed by the Daymark REST API. The minimal dashboard is dedicated to completing habits; selecting a habit opens a full analytics view with KPIs, activity heatmap, weekly and monthly trends, a calendar, streak history, consistency scoring, and personalized insights.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend API URL. For local development this is `http://localhost:4000/api`; in production it should be your Render backend URL ending in `/api`.

Create a production build with:

```bash
npm run build
```

## Drop into another React project

Copy `src/components/HabitTracker.jsx`, render `<HabitTracker />`, and ensure Tailwind scans the component path. Install the runtime dependencies:

```bash
npm install lucide-react framer-motion clsx tailwind-merge
```

The component is client-side and communicates with the backend through `src/lib/api.js`. In Next.js App Router, add `"use client";` as the first line of `HabitTracker.jsx`, and expose the same API URL through your deployment environment.
