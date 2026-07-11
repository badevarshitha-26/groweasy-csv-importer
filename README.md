# GrowEasy — AI-Powered CSV Lead Importer

Upload **any** CSV (Facebook, Google Ads, Excel exports, messy spreadsheets).  
AI maps columns to GrowEasy CRM fields automatically — no fixed templates.

Built for the GrowEasy Software Developer assignment.

---

## Features

### Frontend (Next.js + TypeScript + Tailwind)
- Drag & drop + file picker CSV upload (max 5MB)
- Client-side CSV preview table (sticky headers, horizontal/vertical scroll)
- Confirm Import → only then calls the backend
- Results table with imported + skipped records and totals
- Progress indicator during AI batch processing
- GrowEasy-inspired UI (dark sidebar, orange CTAs)

### Backend (Node.js + Express + TypeScript)
- `POST /api/preview` — parse CSV only (no AI)
- `POST /api/import` — sync AI extraction
- `POST /api/import/async` + progress/results polling
- Batch AI processing with retries
- Zod-free but strong TypeScript types + normalization layer
- Skips rows with neither email nor mobile

### AI (Google Gemini)
- Semantic column mapping (any header names)
- Phone split → `country_code` + `mobile_without_country_code`
- Status / data_source enum enforcement
- Extra emails/phones → `crm_note`

---

## Project structure

```
groweasy-csv-importer/
├── frontend/          # Next.js app (port 3000)
├── backend/           # Express API (port 4000)
├── sample-data/       # Sample CSVs for testing
├── docker-compose.yml
└── README.md
```

---

## Prerequisites

- Node.js 18+
- A free [Google Gemini API key](https://aistudio.google.com/apikey)

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd groweasy-csv-importer
npm run install:all
```

### 2. Configure backend env

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=4000
GEMINI_API_KEY=paste_your_key_here
GEMINI_MODEL=gemini-2.0-flash
AI_BATCH_SIZE=15
AI_MAX_RETRIES=2
CORS_ORIGIN=http://localhost:3000
```

### 3. Configure frontend env

```bash
cp frontend/.env.example frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Run locally (two terminals)

```bash
# Terminal 1 — API
npm run dev:backend

# Terminal 2 — UI
npm run dev:frontend
```

Open **http://localhost:3000**

---

## How to use

1. Click **Import Leads via CSV**
2. Drop a CSV (try `sample-data/messy_facebook_export.csv`)
3. Preview raw rows (no AI yet)
4. Click **Confirm Import**
5. Watch AI progress → see imported + skipped results

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/preview` | Multipart `file` → headers + rows |
| POST | `/api/import` | JSON `{ rows }` or multipart `file` → full AI result |
| POST | `/api/import/async` | Starts job, returns `jobId` |
| GET | `/api/import/:id/progress` | Progress % / batch info |
| GET | `/api/import/:id/results` | Final imported + skipped |

---

## CRM fields extracted

`created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`, `city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`, `description`

**Allowed `crm_status`:** `GOOD_LEAD_FOLLOW_UP` | `DID_NOT_CONNECT` | `BAD_LEAD` | `SALE_DONE`

**Allowed `data_source`:** `leads_on_demand` | `meridian_tower` | `eden_park` | `varah_swamy` | `sarjapur_plots` (or blank)

---

## Tests

```bash
npm test
```

---

## Docker

```bash
export GEMINI_API_KEY=your_key
docker compose up --build
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:4000  

---

## Deployment tips

| Service | Suggested host |
|---------|----------------|
| Frontend | [Vercel](https://vercel.com) — set `NEXT_PUBLIC_API_URL` to your API URL |
| Backend | [Railway](https://railway.app) / [Render](https://render.com) — set `GEMINI_API_KEY`, `CORS_ORIGIN` |

On Render/Railway for backend:
- Root directory: `backend`
- Build: `npm install && npm run build`
- Start: `npm start`

---

## Sample files

- `sample-data/sample_crm_leads.csv` — already in CRM shape
- `sample-data/messy_facebook_export.csv` — different headers (tests AI mapping); includes one row that should be **skipped** (no email/mobile)

---

## Position applied for

> Fill this in your submission email: **Software Developer Intern** or **Software Developer (Full-Time)**

Submit to: **varun@groweasy.ai** with hosted URL + GitHub URL.

---

## License

MIT — built as an assignment submission for GrowEasy.
