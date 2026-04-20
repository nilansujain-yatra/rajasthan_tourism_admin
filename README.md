# 🏛️ Rajasthan Tourism — Admin Booking Management System

A beautiful, production-grade **Next.js 14** admin portal for the Government of Rajasthan's Online Tourist Site Booking & Management System.

## ✨ Design System

**Colour Palette**
| Token | Hex | Usage |
|-------|-----|-------|
| `--maroon` | `#8B1A1A` | Primary brand, sidebar, buttons |
| `--gold` | `#C8922A` | Accents, highlights, active states |
| `--teal` | `#1A7A6E` | Success states, live indicators |
| `--cream` | `#FBF6EF` | Page background |
| `--sand` | `#E8D5B0` | Borders, dividers |

**Typography**
- **Cormorant Garamond** — Headings, stat values, site names (regal & heritage feel)
- **Outfit** — Body text, labels, UI elements (clean & modern)

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── dashboard/          # Main dashboard (stats, charts, recent bookings)
│   ├── places/             # Place/Site management grid
│   ├── bookings/           # Bookings table with filters & pagination
│   ├── finance/            # Revenue & RISL charge breakdown
│   ├── analytics/          # Charts, trends, site performance
│   ├── users/              # User management
│   ├── operations/
│   │   ├── feedback/       # Feedback management
│   │   ├── helpdesk/       # Support tickets
│   │   ├── drivers/        # Driver management
│   │   └── guides/         # Tour guide management
│   ├── reports/
│   │   └── audit/          # Audit trail
│   └── system/
│       ├── logs/           # User activity logs
│       └── status/         # Place active status control
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # Collapsible sidebar nav
│   │   └── Topbar.tsx      # Top header with user info
│   ├── ui/
│   │   ├── StatCard.tsx    # Stat metric card (4 variants)
│   │   ├── PlaceCard.tsx   # Site card with status chip
│   │   └── SectionHeader.tsx # Ornamental section header
│   └── charts/
│       ├── DonutChart.tsx  # Visitor breakdown donut
│       └── BarChart.tsx    # Booking sources + sparkline
└── styles/
    └── globals.css         # Design tokens + custom utilities
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.17+ 
- **npm** or **yarn**

### Installation

```bash
# 1. Navigate to project
cd rajasthan-tourism-admin

# 2. Install dependencies
npm install

# 3. Create local environment config
cp .env.example .env.local

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/dashboard`.

### API Environments

API configuration is centralized in `src/lib/config/env.ts` and consumed through the typed API layer in `src/lib/api`.

| Target | Example file | Local file | Command |
|--------|--------------|------------|---------|
| Local development | `.env.example` | `.env.local` | `npm run dev` |
| Stage | `.env.stage.example` | `.env.stage` | `npm run dev:stage` / `npm run build:stage` |
| Production | `.env.production.example` | `.env.production` | `npm run build:prod` |

Required variables:

```bash
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_API_TIMEOUT_MS=30000
```

Use the exported services for API calls:

```ts
import { bookingsApi } from '@/lib/api'

const bookings = await bookingsApi.list({ page: 1, pageSize: 10 })
```

### Build for Production

```bash
npm run build
npm start
```

---

## 📄 Pages Implemented

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard Overview | Stats, donut chart, bar chart, recent bookings |
| `/places` | Place Management | Site grid with status, visitor counts |
| `/bookings` | Bookings | Full table with filters, search, pagination |
| `/finance` | Finance | Site-wise revenue, RISL charges |
| `/analytics` | Analytics | Monthly trends, site performance index |
| `/users` | User Management | Admin/operator user table |
| `/operations/feedback` | Feedback | Visitor feedback cards with ratings |
| `/operations/helpdesk` | Help Desk | Support ticket management |
| `/operations/drivers` | Driver Mgmt | Driver registry with location |
| `/operations/guides` | Guide Mgmt | Tour guide registry |
| `/reports/audit` | Audit Trail | Admin action audit log |
| `/system/logs` | System Logs | Live user activity logs |
| `/system/status` | Place Status | Toggle online/offline per site |

---

## 🛠️ Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (custom Rajasthan theme)
- **Lucide React** (icons)
- **Google Fonts** — Cormorant Garamond + Outfit

---

## 🎨 Extending the Design

All design tokens live in `src/styles/globals.css` as CSS variables:

```css
:root {
  --maroon:     #8B1A1A;
  --gold:       #C8922A;
  --teal:       #1A7A6E;
  --cream:      #FBF6EF;
  /* ... */
}
```

And in `tailwind.config.js` as Tailwind color tokens:
```js
colors: {
  maroon: { DEFAULT: '#8B1A1A', ... },
  gold:   { DEFAULT: '#C8922A', ... },
}
```

---

*Built for Govt. of Rajasthan · Dept. of Archaeology & Tourism*
