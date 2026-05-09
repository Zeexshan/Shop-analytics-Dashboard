# ShopAnalytics Dashboard

A free, open-source business analytics dashboard for shop owners. Built with React, Express, TypeScript, and Excel-based storage — no database setup required.

## Features

- **Dashboard** — KPI cards, revenue chart, category breakdown, top products, recent sales
- **Products** — Add, edit, delete products with stock tracking and low-stock alerts
- **Sales** — Record sales, auto-update inventory, print receipts
- **Expenses** — Track business expenses by category
- **Goals** — Set monthly/quarterly/yearly revenue, profit, and sales targets
- **Reports** — Generate and download CSV / HTML business reports with custom date ranges
- **Settings** — Change password, view storage stats, reset data

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-username/shop-analytics-dashboard.git
cd shop-analytics-dashboard
npm install
```

### Running the app

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

**Default login credentials:**
- Username: `admin`
- Password: `ShopOwner@2024`

> Change your password immediately after first login via the Settings page.

### Building for production

```bash
npm run build
npm run start
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| Charts | Recharts |
| State | TanStack Query v5 |
| Routing | Wouter |
| Forms | React Hook Form + Zod |
| Backend | Express.js, TypeScript |
| Storage | XLSX (Excel files) |
| Auth | JWT + bcrypt |

## Data Storage

All data is stored locally in `data/shop_data.xlsx`. This file is excluded from git (via `.gitignore`) so your business data stays private.

## Project Structure

```
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── contexts/
│       ├── hooks/
│       └── lib/
├── server/          # Express backend
│   ├── routes.ts
│   ├── storage.ts
│   ├── excel-storage.ts
│   └── middleware.ts
├── shared/          # Shared TypeScript types + Zod schemas
└── data/            # Excel data files (gitignored)
```

## License

MIT — see [LICENSE](LICENSE) for details.

## Developer

Built by **zeexshan**
