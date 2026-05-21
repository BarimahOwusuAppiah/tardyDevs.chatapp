# tardyDevs Chat

<div align="center">

![tardyDevs Chat](https://img.shields.io/badge/tardyDevs-Chat-6DC52A?style=for-the-badge&labelColor=0F0F0F)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=0F0F0F)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0F0F0F)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white&labelColor=0F0F0F)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=0F0F0F)
![License](https://img.shields.io/badge/License-MIT-6DC52A?style=for-the-badge&labelColor=0F0F0F)

**A real-time team chat platform built for developer teams.**  
Channel messaging · Direct messages · Live presence · Reply threading · Admin dashboard

</div>

---

## Overview

tardyDevs Chat is a full-stack real-time messaging application inspired by Slack, purpose-built for developer teams. It combines the power of React 18, TypeScript, and Supabase to deliver instant messaging across public channels and private direct conversations — with zero page reloads, live online/offline presence, and a clean dark-themed UI.

The entire backend is powered by Supabase — handling authentication, PostgreSQL database, Row Level Security policies, and WebSocket-based real-time subscriptions — meaning there is no custom server to maintain or deploy.

---

## Features

### Messaging
- 💬 **Channel messaging** — public channels with real-time message delivery
- 📨 **Direct messages (DMs)** — private one-on-one conversations between users
- ↩️ **Reply threading** — reply to any message with a quoted preview
- 🗑️ **Message deletion** — users can delete their own messages
- 📎 **File attachment support** — attach images and documents to messages

### Users & Presence
- 🔐 **Email/password authentication** — secure signup, login, and logout via Supabase Auth
- 🟢 **Live presence indicators** — real-time online/offline status for all users
- 🔍 **User search** — search users by username to start a DM instantly
- 👤 **User profiles** — avatar, username, bio, and last-seen timestamp
- ✅ **Read receipts** — see when your DMs have been read

### UI & Experience
- 🌙 **Dark theme** — deep black background with lime green accent (`#5DD62C`)
- 📱 **Fully responsive** — mobile-first layout with collapsible sidebar
- 🔔 **Real-time notifications** — in-app notification panel for new messages
- ✨ **Animated splash screen** — branded loading experience on first visit
- 🏎️ **Optimistic UI updates** — messages appear instantly before server confirmation

### Admin
- 🛡️ **Admin dashboard** — system monitoring and user management at `/admin`
- 🔒 **Role-based access control** — `user` and `admin` roles enforced at the database level via RLS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS + inline CSS-in-JS |
| State Management | Zustand |
| Routing | React Router v7 |
| Backend / Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Real-time | Supabase Realtime (WebSockets) |
| Date Formatting | date-fns |
| Icons | Lucide React |

---

## Project Structure

```
tardydevs-chat/
├── public/
│   ├── favicon.svg          # Brand logo (SVG)
│   └── tardy-logo.svg       # Full logo asset
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Avatar.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Logo.tsx          # Brand logo SVG component
│   │   └── SplashScreen.tsx  # Animated loading screen
│   ├── hooks/
│   │   └── useAuth.tsx       # Auth state provider
│   ├── layouts/
│   │   ├── AppLayout.tsx     # Root layout wrapper
│   │   └── ChatLayout.tsx    # Main chat shell (sidebar + rail + topbar)
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client initialisation
│   │   └── types.ts          # Shared TypeScript types
│   ├── pages/
│   │   ├── LoginPage.tsx     # Login + Register page
│   │   ├── ChatDashboard.tsx # Channel message view
│   │   ├── DmChat.tsx        # Direct message conversation view
│   │   ├── NotFoundPage.tsx  # 404 page
│   │   └── admin/
│   │       └── AdminDashboard.tsx
│   ├── routes/
│   │   └── AppRoutes.tsx     # Route definitions + auth guards
│   ├── services/             # Supabase query abstractions
│   │   ├── authService.ts
│   │   ├── channelService.ts
│   │   ├── dmService.ts
│   │   └── messageService.ts
│   ├── store/                # Zustand global state
│   │   ├── authStore.ts
│   │   ├── channelStore.ts
│   │   ├── dmStore.ts
│   │   └── messageStore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── schema.sql            # Base schema
├── supabase-dm-migration.sql # Full production migration (recommended)
├── .env.example
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Database Schema

The production schema is defined in `supabase-dm-migration.sql`. It creates the following tables:

| Table | Description |
|---|---|
| `profiles` | Public user info — username, avatar, bio, online status |
| `channels` | Public chat channels |
| `messages` | Channel messages with reply support |
| `direct_conversations` | DM thread metadata between two users |
| `direct_messages` | Individual DM messages with read receipts and reply support |

All tables have **Row Level Security (RLS)** enabled. Users can only read and write data they are authorised to access.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/tardydevs-chat.git
cd tardydevs-chat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these in your Supabase project under **Settings → API**.

### 4. Set up the database

In your Supabase project, open the **SQL Editor** and run the full migration script:

```bash
# Copy the contents of this file and paste into Supabase SQL Editor
supabase-dm-migration.sql
```

This will create all tables, indexes, RLS policies, triggers, and seed the default channels.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deployment

### Vercel (recommended)

1. Push your repository to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add your environment variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Vite and configures the build

### Netlify

1. Push to GitHub
2. Connect repository in Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables and deploy

---

## Admin Access

The admin dashboard is available at `/admin` for users with the `admin` role.

To grant admin access to a user, run this in the Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'paste-user-uuid-here';
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | ✅ |

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow the existing code style and keep commits focused and descriptive.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ by the tardyDevs team
</div>
