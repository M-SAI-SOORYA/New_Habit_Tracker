"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Edit3,
  Flame,
  Footprints,
  HeartPulse,
  Leaf,
  MoreHorizontal,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs) => twMerge(clsx(inputs));
const STORAGE_KEY = "pulse-habits-v1";
const DAY_MS = 86_400_000;

const COLORS = [
  { name: "Violet", value: "#8b5cf6" },
  { name: "Emerald", value: "#22c55e" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Blue", value: "#3b82f6" },
];

const ICONS = {
  fitness: Dumbbell,
  mindfulness: Brain,
  learning: BookOpen,
  health: HeartPulse,
  movement: Footprints,
  work: BriefcaseBusiness,
  nature: Leaf,
};

const CATEGORIES = [
  { value: "fitness", label: "Fitness" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "learning", label: "Learning" },
  { value: "health", label: "Health" },
  { value: "movement", label: "Movement" },
  { value: "work", label: "Productivity" },
  { value: "nature", label: "Wellness" },
];

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(key) {
  return new Date(`${key}T12:00:00`);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysBetween(start, end) {
  return Math.max(0, Math.round((fromKey(dateKey(end)) - fromKey(dateKey(start))) / DAY_MS));
}

function rangeEndingToday(length, offset = 0) {
  return Array.from({ length }, (_, index) => addDays(new Date(), index - length + 1 - offset));
}

function seedCompletions(pattern) {
  return Object.fromEntries(
    rangeEndingToday(120)
      .filter((date, index) => pattern(date, index))
      .map((date) => [dateKey(date), true]),
  );
}

function seedHabits() {
  return [
    {
      id: "seed-meditate",
      name: "Morning meditation",
      category: "mindfulness",
      color: "#8b5cf6",
      frequency: 7,
      createdAt: dateKey(addDays(new Date(), -119)),
      completions: seedCompletions((_, i) => i % 7 !== 1 && i % 11 !== 0),
    },
    {
      id: "seed-workout",
      name: "Strength training",
      category: "fitness",
      color: "#22c55e",
      frequency: 4,
      createdAt: dateKey(addDays(new Date(), -104)),
      completions: seedCompletions((date, i) => ![0, 3, 6].includes(date.getDay()) && i % 13 !== 0),
    },
    {
      id: "seed-read",
      name: "Read 20 pages",
      category: "learning",
      color: "#06b6d4",
      frequency: 5,
      createdAt: dateKey(addDays(new Date(), -92)),
      completions: seedCompletions((date, i) => date.getDay() !== 6 && i % 9 !== 0),
    },
  ];
}

function loadHabits() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedHabits();
  } catch {
    return seedHabits();
  }
}

function getStreakData(habit) {
  const done = habit.completions || {};
  const completedKeys = Object.keys(done).filter((key) => done[key]).sort();
  const runs = [];
  let currentRun = null;

  completedKeys.forEach((key) => {
    const date = fromKey(key);
    if (currentRun && daysBetween(currentRun.end, date) === 1) {
      currentRun.end = date;
      currentRun.length += 1;
    } else {
      currentRun = { start: date, end: date, length: 1 };
      runs.push(currentRun);
    }
  });

  let cursor = new Date();
  if (!done[dateKey(cursor)]) cursor = addDays(cursor, -1);
  let current = 0;
  while (done[dateKey(cursor)]) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...runs].sort((a, b) => b.length - a.length);
  const ongoingEndKey = done[dateKey()] ? dateKey() : dateKey(addDays(new Date(), -1));
  const currentRankIndex = current
    ? sorted.findIndex((run) => dateKey(run.end) === ongoingEndKey && run.length === current)
    : -1;
  return {
    current,
    longest: sorted[0]?.length || 0,
    bestRun: sorted[0] || null,
    rank: currentRankIndex >= 0 ? currentRankIndex + 1 : null,
    runs: sorted,
  };
}

function trackedDates(habit) {
  const start = fromKey(habit.createdAt);
  return rangeEndingToday(daysBetween(start, new Date()) + 1).filter((date) => date >= start);
}

function rateForDates(habit, dates) {
  const today = dateKey();
  const eligible = dates.filter((date) => dateKey(date) >= habit.createdAt && dateKey(date) <= today);
  if (!eligible.length) return 0;
  const complete = eligible.filter((date) => habit.completions?.[dateKey(date)]).length;
  return Math.round((complete / eligible.length) * 100);
}

function habitAnalytics(habit) {
  const dates = trackedDates(habit);
  const total = dates.filter((date) => habit.completions?.[dateKey(date)]).length;
  const rate = dates.length ? Math.round((total / dates.length) * 100) : 0;
  const last30 = rateForDates(habit, rangeEndingToday(30));
  const streak = getStreakData(habit);
  const weekdayMisses = Array(7).fill(0);
  const weekdaySuccess = Array(7).fill(0);
  const weekdayTotals = Array(7).fill(0);

  dates.forEach((date) => {
    weekdayTotals[date.getDay()] += 1;
    if (habit.completions?.[dateKey(date)]) weekdaySuccess[date.getDay()] += 1;
    else weekdayMisses[date.getDay()] += 1;
  });

  const bestWeekdayIndex = weekdaySuccess
    .map((value, index) => ({ index, value: weekdayTotals[index] ? value / weekdayTotals[index] : 0 }))
    .sort((a, b) => b.value - a.value)[0]?.index ?? 1;
  const missedWeekdayIndex = weekdayMisses
    .map((value, index) => ({ index, value }))
    .sort((a, b) => b.value - a.value)[0]?.index ?? 1;
  const consistency = Math.round(rate * 0.65 + last30 * 0.35);

  return {
    total,
    missed: dates.length - total,
    rate,
    last30,
    totalDays: dates.length,
    consistency,
    streak,
    bestWeekday: new Date(2024, 0, 7 + bestWeekdayIndex).toLocaleDateString(undefined, { weekday: "long" }),
    missedWeekday: new Date(2024, 0, 7 + missedWeekdayIndex).toLocaleDateString(undefined, { weekday: "long" }),
  };
}

function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="glass max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-b-0 sm:rounded-3xl sm:border-b"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HabitForm({ habit, onSave, onClose }) {
  const [form, setForm] = useState(habit || { name: "", category: "fitness", color: "#8b5cf6", frequency: 7 });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (form.name.trim()) onSave({ ...form, name: form.name.trim(), frequency: Number(form.frequency) });
  };

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400">Build momentum</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{habit ? "Edit habit" : "Create a habit"}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Close">
          <X size={19} />
        </button>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">Habit name</span>
          <input
            autoFocus
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. Journal for 10 minutes"
            className="h-[52px] w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-base text-white placeholder:text-zinc-600 focus:border-violet-500/70 sm:text-sm"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-zinc-300">Category</span>
            <div className="relative">
              <select value={form.category} onChange={(event) => update("category", event.target.value)} className="min-h-[52px] w-full appearance-none rounded-2xl border border-white/10 bg-[#11141c] px-4 text-sm text-white">
                {CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-[18px] text-zinc-500" size={16} />
            </div>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-zinc-300">Frequency</span>
            <div className="relative">
              <select value={form.frequency} onChange={(event) => update("frequency", event.target.value)} className="min-h-[52px] w-full appearance-none rounded-2xl border border-white/10 bg-[#11141c] px-4 text-sm text-white">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{day === 7 ? "Every day" : `${day} days / week`}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-[18px] text-zinc-500" size={16} />
            </div>
          </label>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-zinc-300">Color</legend>
          <div className="flex flex-wrap gap-4">
            {COLORS.map((color) => (
              <motion.button
                whileTap={{ scale: 0.85 }}
                type="button"
                key={color.value}
                onClick={() => update("color", color.value)}
                className="grid h-11 w-11 place-items-center rounded-full"
                style={{ backgroundColor: color.value, boxShadow: form.color === color.value ? `0 0 0 3px #11131a, 0 0 0 5px ${color.value}` : "none" }}
                aria-label={color.name}
              >
                {form.color === color.value && <Check size={18} strokeWidth={3} />}
              </motion.button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex gap-3 border-t border-white/[0.07] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:justify-end sm:px-6 sm:py-5">
        <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl px-4 text-sm font-medium text-zinc-400 hover:bg-white/5 sm:flex-none">Cancel</button>
        <motion.button whileTap={{ scale: 0.96 }} type="submit" className="min-h-12 flex-1 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500 sm:flex-none">
          {habit ? "Save changes" : "Create habit"}
        </motion.button>
      </div>
    </form>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-700 shadow-lg shadow-violet-950/40">
        <Zap size={18} fill="currentColor" />
      </div>
      <span className="text-base font-bold tracking-tight text-white">daymark</span>
    </div>
  );
}

function DashboardHabitCard({ habit, onOpen, onToggle, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false);
  const Icon = ICONS[habit.category] || Target;
  const todayDone = Boolean(habit.completions?.[dateKey()]);
  const streak = getStreakData(habit);
  const weekRate = rateForDates(habit, rangeEndingToday(7));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={() => onOpen(habit.id)}
      className="glass group relative cursor-pointer overflow-visible rounded-2xl p-4 transition hover:border-white/[0.12] sm:p-5"
    >
      <div className="absolute bottom-0 left-6 right-6 h-px opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${habit.color}, transparent)` }} />
      <div className="flex items-center gap-3.5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl sm:h-[52px] sm:w-[52px]" style={{ color: habit.color, backgroundColor: `${habit.color}16` }}>
          <Icon size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-white sm:text-base">{habit.name}</h2>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Flame size={15} className="text-orange-400" fill="currentColor" />
            <span className="text-sm font-bold text-zinc-200">{streak.current}</span>
            <span className="text-xs text-zinc-500">day streak</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(event) => { event.stopPropagation(); onToggle(habit.id); }}
          className={cn("relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border transition", todayDone ? "border-transparent text-white" : "border-white/10 bg-white/[0.035] text-zinc-600")}
          style={todayDone ? { backgroundColor: habit.color, boxShadow: `0 0 22px ${habit.color}3d` } : {}}
          aria-label={todayDone ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
        >
          <AnimatePresence mode="wait">
            <motion.span key={String(todayDone)} initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              {todayDone ? <Check size={24} strokeWidth={3} /> : <Plus size={21} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <div className="relative hidden sm:block">
          <button onClick={(event) => { event.stopPropagation(); setMenu((value) => !value); }} className="grid h-11 w-9 place-items-center rounded-lg text-zinc-600 hover:bg-white/5 hover:text-white" aria-label="Habit actions">
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-0 top-11 z-20 w-32 rounded-xl border border-white/10 bg-[#171a23] p-1.5 shadow-2xl">
                <button onClick={(event) => { event.stopPropagation(); onEdit(habit); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zinc-300 hover:bg-white/5"><Edit3 size={14} /> Edit</button>
                <button onClick={(event) => { event.stopPropagation(); onDelete(habit.id); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10"><Trash2 size={14} /> Delete</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.055]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${weekRate}%` }} className="h-full rounded-full" style={{ backgroundColor: habit.color }} />
        </div>
        <span className="w-16 text-right text-[10px] font-medium text-zinc-600">{weekRate}% this week</span>
      </div>
    </motion.article>
  );
}

function Dashboard({ habits, onOpen, onAdd, onToggle, onEdit, onDelete }) {
  const completed = habits.filter((habit) => habit.completions?.[dateKey()]).length;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -24 }} className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.055] bg-[#07090f]/85 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <button onClick={onAdd} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-violet-100 sm:px-4">
            <Plus size={16} strokeWidth={2.5} /> Add habit
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 pb-16 pt-7 sm:px-6 sm:pt-11">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-violet-400"><Sparkles size={14} /> {greeting}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">Today</h1>
          <p className="mt-2 text-sm text-zinc-500">{completed} of {habits.length} completed · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>

        <section className="mt-8 space-y-3" aria-label="Your habits">
          <AnimatePresence mode="popLayout">
            {habits.map((habit) => (
              <DashboardHabitCard key={habit.id} habit={habit} onOpen={onOpen} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
          {!habits.length && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl px-6 py-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-400"><Leaf size={24} /></div>
              <h2 className="mt-5 text-base font-semibold text-white">Start with one small habit</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">Consistency grows from simple actions you can repeat every day.</p>
              <button onClick={onAdd} className="mt-6 min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white">Create your first habit</button>
            </motion.div>
          )}
        </section>

        {habits.length > 0 && (
          <button onClick={onAdd} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 text-sm font-medium text-zinc-500 transition hover:border-violet-500/30 hover:bg-violet-500/[0.035] hover:text-violet-400">
            <Plus size={17} /> Add another habit
          </button>
        )}
      </main>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value, suffix, color }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={15} style={{ color }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-xs">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}<span className="ml-1 text-xs font-medium text-zinc-500 sm:text-sm">{suffix}</span></p>
    </motion.div>
  );
}

function ModernHeatmap({ habit }) {
  const today = new Date();
  const startOfWeek = addDays(today, -today.getDay());
  const start = addDays(startOfWeek, -51 * 7);
  const dates = Array.from({ length: 364 }, (_, index) => addDays(start, index));
  const monthLabels = [];
  dates.forEach((date, index) => {
    if (date.getDate() === 1) {
      const column = Math.floor(index / 7);
      if (!monthLabels.some((label) => label.column === column)) {
        monthLabels.push({ column, text: date.toLocaleDateString(undefined, { month: "short" }) });
      }
    }
  });

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Activity</h2>
          <p className="mt-1 text-xs text-zinc-500">Your consistency over the last 12 months</p>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
          Less
          {[0, 0.25, 0.5, 0.75, 1].map((opacity, index) => <span key={index} className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: opacity ? `${habit.color}${Math.round((0.25 + opacity * 0.75) * 255).toString(16).padStart(2, "0")}` : "#20232c" }} />)}
          More
        </div>
      </div>

      <div className="heat-scroll mt-7 overflow-x-auto pb-2">
        <div className="min-w-[1242px]">
          <div className="ml-9 mb-2 grid h-4 gap-x-1.5 text-[10px] font-medium text-zinc-600" style={{ gridTemplateColumns: "repeat(52, 18px)" }}>
            {monthLabels.map((label) => <span key={`${label.column}-${label.text}`} style={{ gridColumn: label.column + 1 }}>{label.text}</span>)}
          </div>
          <div className="flex gap-3">
            <div className="grid grid-rows-7 gap-1.5 text-[9px] text-zinc-600">
              {["Sun", "", "Tue", "", "Thu", "", "Sat"].map((label, index) => <span key={index} className="flex h-[18px] items-center">{label}</span>)}
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1.5">
              {dates.map((date) => {
                const key = dateKey(date);
                const done = Boolean(habit.completions?.[key]);
                const future = key > dateKey(today);
                const tracked = key >= habit.createdAt && !future;
                const rollingRate = rateForDates(habit, Array.from({ length: 7 }, (_, index) => addDays(date, index - 6)));
                const level = tracked && done ? 0.38 + rollingRate * 0.0062 : 0;
                return (
                  <motion.div
                    whileHover={{ scale: 1.35, zIndex: 10 }}
                    key={key}
                    title={`${date.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })} — ${future ? "Future" : !tracked ? "Not tracked" : done ? "Completed" : "Missed"}`}
                    className="h-[18px] w-[18px] rounded-[5px] border border-white/[0.035]"
                    style={{ backgroundColor: future || !tracked ? "#13161d" : done ? `${habit.color}${Math.round(level * 255).toString(16).padStart(2, "0")}` : "#20232c" }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendChart({ title, subtitle, data, color }) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      <div className="mt-6 flex h-36 items-end gap-2 sm:gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="relative flex flex-1 items-end justify-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, item.value)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="group relative w-full max-w-9 rounded-t-lg"
                style={{ background: `linear-gradient(to top, ${color}85, ${color})`, boxShadow: `0 0 14px ${color}20` }}
              >
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-zinc-800 px-1.5 py-1 text-[9px] font-semibold text-white opacity-0 shadow-xl transition group-hover:opacity-100">{item.value}%</span>
              </motion.div>
            </div>
            <span className="mt-2 truncate text-center text-[9px] font-medium text-zinc-600">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HabitCalendar({ habit }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  const viewed = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(viewed.getFullYear(), viewed.getMonth() + 1, 0).getDate();
  const leading = viewed.getDay();
  const cells = Array.from({ length: leading + daysInMonth }, (_, index) => index < leading ? null : new Date(viewed.getFullYear(), viewed.getMonth(), index - leading + 1));
  const todayKey = dateKey();

  return (
    <section className="glass overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07]"
            style={{ color: habit.color, backgroundColor: `${habit.color}12` }}
          >
            <CalendarDays size={19} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Calendar</p>
            <h2 className="mt-0.5 truncate text-base font-semibold text-white">
              {viewed.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
          <button onClick={() => setMonthOffset((value) => value - 1)} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[0.07] hover:text-white" aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button onClick={() => setMonthOffset((value) => Math.min(0, value + 1))} disabled={monthOffset === 0} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-25" aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 p-4 pt-3 text-center sm:gap-2 sm:p-5 sm:pt-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="pb-1.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{day}</span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const key = dateKey(date);
          const done = Boolean(habit.completions?.[key]);
          const future = key > todayKey;
          const isToday = key === todayKey;
          return (
            <motion.div
              key={key}
              whileHover={{ scale: 1.06 }}
              title={`${date.toLocaleDateString()} - ${done ? "Completed" : future ? "Future" : "Missed"}`}
              className={cn(
                "relative grid aspect-square min-h-9 place-items-center rounded-xl border text-[13px] font-semibold transition sm:min-h-10 sm:text-sm",
                isToday && "ring-2 ring-white/80 ring-offset-2 ring-offset-[#10131b]",
                future && "border-transparent text-zinc-700",
                !future && !done && "border-white/[0.045] bg-white/[0.035] text-zinc-400",
              )}
              style={done ? {
                color: "white",
                borderColor: `${habit.color}80`,
                background: `linear-gradient(145deg, ${habit.color}, ${habit.color}c8)`,
                boxShadow: `0 7px 18px ${habit.color}25`,
              } : undefined}
            >
              {date.getDate()}
              {done && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/80" />}
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 border-t border-white/[0.05] px-4 py-3 text-[10px] font-medium text-zinc-500 sm:px-5">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: habit.color }} /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-white/[0.08] bg-white/[0.04]" /> Missed</span>
        <span className="ml-auto flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-white/70" /> Today</span>
      </div>
    </section>
  );
}

function AnalyticsPage({ habit, onBack, onToggle, onEdit, onDelete }) {
  const analytics = useMemo(() => habitAnalytics(habit), [habit]);
  const Icon = ICONS[habit.category] || Target;
  const todayDone = Boolean(habit.completions?.[dateKey()]);
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const offset = (7 - 1 - index) * 7;
    const dates = rangeEndingToday(7, offset);
    return { label: index === 7 ? "Now" : `W${index + 1}`, value: rateForDates(habit, dates) };
  });
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const length = end.getDate();
    const dates = Array.from({ length }, (_, day) => new Date(date.getFullYear(), date.getMonth(), day + 1));
    return { label: start.toLocaleDateString(undefined, { month: "short" }), value: rateForDates(habit, dates) };
  });
  const bestPeriod = analytics.streak.bestRun
    ? `${analytics.streak.bestRun.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${analytics.streak.bestRun.end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "No streak yet";

  return (
    <motion.div key={habit.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.055] bg-[#07090f]/88 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
          <button onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white">
            <ArrowLeft size={19} /> <span className="hidden sm:inline">All habits</span>
          </button>
          <span className="text-sm font-semibold text-white">Habit analytics</span>
          <div className="flex">
            <button onClick={() => onEdit(habit)} className="grid h-11 w-11 place-items-center rounded-xl text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Edit habit"><Edit3 size={17} /></button>
            <button onClick={() => onDelete(habit.id)} className="grid h-11 w-11 place-items-center rounded-xl text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Delete habit"><Trash2 size={17} /></button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-7 sm:px-6 sm:pt-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl sm:h-16 sm:w-16" style={{ color: habit.color, backgroundColor: `${habit.color}18`, boxShadow: `0 0 28px ${habit.color}18` }}>
              <Icon size={26} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{CATEGORIES.find((category) => category.value === habit.category)?.label}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{habit.name}</h1>
              <p className="mt-1 text-xs text-zinc-500">Tracking since {fromKey(habit.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onToggle(habit.id)}
            className={cn("flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold sm:w-auto", todayDone ? "border-transparent text-white" : "border-white/10 bg-white/[0.035] text-zinc-300")}
            style={todayDone ? { backgroundColor: habit.color, boxShadow: `0 0 24px ${habit.color}38` } : {}}
          >
            {todayDone ? <Check size={19} strokeWidth={3} /> : <Plus size={19} />}
            {todayDone ? "Completed today" : "Mark complete"}
          </motion.button>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-stretch">
          <HabitCalendar habit={habit} />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <KpiCard icon={Flame} label="Current streak" value={analytics.streak.current} suffix="days" color="#f97316" />
            <KpiCard icon={Trophy} label="Longest streak" value={analytics.streak.longest} suffix="days" color="#f59e0b" />
            <KpiCard icon={Target} label="Completion" value={analytics.rate} suffix="%" color={habit.color} />
            <KpiCard icon={Check} label="Completed" value={analytics.total} suffix="days" color="#22c55e" />
            <KpiCard icon={X} label="Missed" value={analytics.missed} suffix="days" color="#f43f5e" />
            <KpiCard icon={CalendarDays} label="Days tracked" value={analytics.totalDays} suffix="" color="#06b6d4" />
          </div>
        </section>

        <section className="mt-4">
          <ModernHeatmap habit={habit} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <TrendChart title="Weekly completion" subtitle="Your completion rate over the last 8 weeks" data={weekly} color={habit.color} />
          <TrendChart title="Monthly trend" subtitle="A longer view of your progress" data={monthly} color={habit.color} />
        </section>

        <section className="mt-4">
          <div className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Smart insights</h2>
                <p className="mt-1 text-xs text-zinc-500">Patterns found in your activity</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-400"><Sparkles size={18} /></div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Consistency score</p>
                  <p className="mt-1 text-3xl font-bold text-white">{analytics.consistency}<span className="text-sm text-zinc-600">/100</span></p>
                </div>
                <BarChart3 size={24} style={{ color: habit.color }} />
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${analytics.consistency}%` }} className="h-full rounded-full" style={{ backgroundColor: habit.color }} />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                `You're most consistent on ${analytics.bestWeekday}s.`,
                `You've completed this habit ${analytics.last30}% of the last 30 days.`,
                analytics.streak.rank === 2 ? "Your current streak is your second longest." : `Your longest streak lasted ${analytics.streak.longest} days.`,
                `${analytics.missedWeekday} is your most missed weekday.`,
              ].map((insight) => (
                <div key={insight} className="flex gap-3 rounded-xl bg-white/[0.025] px-3.5 py-3 text-xs leading-5 text-zinc-400">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
                  {insight}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3">
              <span className="text-xs text-zinc-500">Best streak period</span>
              <span className="text-xs font-semibold text-zinc-200">{bestPeriod}</span>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
}

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  useEffect(() => {
    setHabits(loadHabits());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits, hydrated]);

  const selectedHabit = habits.find((habit) => habit.id === selectedId);

  const toggleHabit = (id) => {
    if (navigator.vibrate) navigator.vibrate(18);
    const today = dateKey();
    setHabits((current) => current.map((habit) => habit.id === id
      ? { ...habit, completions: { ...habit.completions, [today]: !habit.completions?.[today] } }
      : habit));
  };

  const openAdd = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  const openEdit = (habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  const saveHabit = (form) => {
    if (editingHabit) {
      setHabits((current) => current.map((habit) => habit.id === editingHabit.id ? { ...habit, ...form } : habit));
    } else {
      setHabits((current) => [...current, { ...form, id: crypto.randomUUID(), createdAt: dateKey(), completions: {} }]);
    }
    setModalOpen(false);
    setEditingHabit(null);
  };

  const deleteHabit = (id) => {
    const habit = habits.find((item) => item.id === id);
    if (habit && window.confirm(`Delete “${habit.name}”? This cannot be undone.`)) {
      setHabits((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090f] text-zinc-200">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-48 -top-48 h-[480px] w-[480px] rounded-full bg-violet-700/[0.09] blur-[120px]" />
        <div className="absolute -right-48 top-1/2 h-[420px] w-[420px] rounded-full bg-cyan-600/[0.045] blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {selectedHabit ? (
          <AnalyticsPage key={`analytics-${selectedHabit.id}`} habit={selectedHabit} onBack={() => setSelectedId(null)} onToggle={toggleHabit} onEdit={openEdit} onDelete={deleteHabit} />
        ) : (
          <Dashboard key="dashboard" habits={habits} onOpen={setSelectedId} onAdd={openAdd} onToggle={toggleHabit} onEdit={openEdit} onDelete={deleteHabit} />
        )}
      </AnimatePresence>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingHabit(null); }}>
        <HabitForm habit={editingHabit} onSave={saveHabit} onClose={() => { setModalOpen(false); setEditingHabit(null); }} />
      </Modal>
    </div>
  );
}
