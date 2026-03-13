<div align="center">
  <h1>🎯 Quizzila</h1>
  <p><strong>A professional, real-time interactive quiz platform for live events, auditoriums, and corporate training.</strong></p>
</div>

<br />

Quizzila is an ultra-premium, low-latency live quiz application built for high-stakes environments. Engineered to support **120+ concurrent teams** with sub-second synchronization, it offers a Mentimeter-style participant experience, real-time leaderboard rendering, and a robust administrative control center.

## ✨ Key Features

- **⚡ Real-Time Synchronization**: Built on Supabase Realtime, guaranteeing that the host's control board and participant screens remain perfectly in sync under heavy concurrent load. 
- **🖥️ Mentimeter-Style Flow**: Participants are locked from seeing the correct answer upon submission. Answers, live statistics, and rankings are revealed dynamically only when the host triggers them.
- **🥇 Dynamic Leaderboard & FFF Scoring**: Fastest Finger First (FFF) scoring rewards quicker responses. Standings and rankings are intelligently pushed to all connected clients.
- **🛡️ Secure Team Registration**: Built-in participant intake flow featuring duplicate name prevention, capacity limits, and automatic session persistence.
- **🕹️ Admin Command Center**: A comprehensive dashboard featuring:
  - **Live Monitoring**: Track team registrations and latency in real-time.
  - **Shadow Leaderboard**: Preview standings before revealing them to the audience.
  - **Question Management**: Full CRUD capabilities and bulk JSON import for quiz content.
  - **Session Controls**: Granular control over quiz flow, answer reveals, and total session resets.

## 🛠️ Architecture & Tech Stack

This application is built using a modern, scalable stack designed for edge performance and immediate data delivery:

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime Subscriptions, Row Level Security)
- **Deployment**: Optimized for Vercel/Edge networks

## 🚀 Quick Setup Guide

### 1. Repository Initialization
Clone the repository and install dependencies:
```bash
git clone https://github.com/karbburn/quizzila.git
cd quizzila
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Schema setup
Navigate to your Supabase SQL Editor and execute the provided `supabase_schema.sql` file. This script automatically configures:
- Tables (`questions`, `teams`, `answers`, `quiz_state`)
- Enums (`quiz_status` including `answer_reveal` and `leaderboard`)
- PostgREST RPC Functions for secure data fetching
- Row Level Security (RLS) policies

### 4. Development Server
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`. Access the admin controls natively via `/admin`.

---

<div align="center">
  <i>Engineered for reliability, speed, and audience engagement.</i>
</div>
