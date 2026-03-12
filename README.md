# Quizzila 🚀

Quizzila is an ultra-premium, real-time quiz application designed for live events and auditoriums. Built with a focus on high-energy engagement and aesthetic excellence, it supports up to 120+ concurrent teams with low-latency synchronization.

## ✨ Features

- **💎 Ultra-Premium UI**: Immersive dark mode with glassmorphism, animated grids, and cinematic transitions.
- **⚡ Synchronized Gameplay**: Real-time state management using Supabase, ensuring every participant is in sync with the host.
- **🥇 Fastest Finger First (FFF)**: Dynamic scoring system where faster answers earn more points (Menti-style bonus).
- **🛡️ Team Registration**: Built-in flow for team names and member management.
- **🕹️ Admin Command Center**: robust dashboard for quiz control, live monitoring, and bulk question management.
- **📥 Bulk Import**: Effortlessly populate your quiz by importing questions via JSON.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Animations**: [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/) (Icons)
- **State Management**: Custom React Hooks with Supabase Subscriptions

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/karbburn/quizzila.git
cd quizzila
npm install
```

### 2. Configure Supabase
Create a `.env.local` file with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Apply Schema
Run the provided `supabase_schema.sql` in your Supabase SQL Editor to set up the necessary tables, enums, and RLS policies.

### 4. Run Development Server
```bash
npm run dev
```

## 📊 Database Schema

The production-grade schema includes:
- `questions`: Question text, options, and order.
- `teams`: Team registration and scoring.
- `answers`: Individual team submissions with time-stamped bonus points.
- `quiz_state`: Synchronized global game state (waiting, countdown, active, etc.).

---

Created with ❤️ for high-stakes live events.
