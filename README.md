# Daymark Habit Tracker

A polished, mobile-first React habit tracker with local persistence and animated interactions. The minimal dashboard is dedicated to completing habits; selecting a habit opens a full analytics view with KPIs, a 12-week activity heatmap, weekly and monthly trends, a calendar, streak history, consistency scoring, and personalized insights.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Drop into another React project

Copy `src/components/HabitTracker.jsx`, render `<HabitTracker />`, and ensure Tailwind scans the component path. Install the runtime dependencies:

```bash
npm install lucide-react framer-motion clsx tailwind-merge
```

The component is client-side and uses `localStorage`. In Next.js App Router, add `"use client";` as the first line of `HabitTracker.jsx`.
