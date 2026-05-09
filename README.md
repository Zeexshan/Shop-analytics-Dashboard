# Shop Analytics Dashboard

A free, open-source business analytics dashboard for shopkeepers. Built with React, Express, TypeScript, and Excel-based storage.

## Features

- **Dashboard** — Real-time KPIs: Revenue, Profit, Sales Count, Goal Progress, Low Stock Alerts
- **Products** — Full inventory management with stock tracking, SKU, categories, and edit/delete
- **Sales** — Record sales with automatic stock deduction, profit calculation, and receipt printing
- **Expenses** — Track business expenses by category with date filtering
- **Goals** — Set monthly, quarterly, and yearly revenue/profit/sales targets with live progress
- **Reports** — Export business data as CSV or HTML reports

## Getting Started

### Requirements
- Node.js 20+

### Installation

```bash
npm install
npm run dev
```

Open `http://localhost:5000` in your browser.

### Default Login

| Field    | Value          |
|----------|----------------|
| Username | `admin`        |
| Password | `ShopOwner@2024` |

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, TypeScript, Vite          |
| UI       | Shadcn/UI, Tailwind CSS, Radix UI   |
| Charts   | Recharts                            |
| State    | TanStack Query v5                   |
| Routing  | Wouter                              |
| Forms    | React Hook Form + Zod               |
| Backend  | Express.js (Node.js)                |
| Storage  | Excel (.xlsx) via SheetJS           |
| Auth     | JWT + Bcrypt                        |

## Project Structure

```
├── client/src/
│   ├── components/    # Reusable UI components
│   ├── contexts/      # Auth context
│   ├── pages/         # Dashboard, Products, Sales, Expenses, Goals, Reports
│   └── lib/           # API client, query client
├── server/
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Storage interface
│   ├── excel-storage.ts  # Excel persistence layer
│   └── middleware.ts  # JWT auth middleware
└── shared/
    └── schema.ts      # Shared TypeScript types + Zod schemas
```

## License

MIT License — see [LICENSE](LICENSE) for details.
