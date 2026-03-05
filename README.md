# MTLL Slot Engine

A Next.js web application for optimizing surveyor job scheduling. Identifies available time slots in a surveyor's schedule, validates drive-time viability between locations, and ranks slot offers based on customer preferences.

Built as a web replacement for an Excel-based scheduling workflow, integrating with NextBillion.ai for geocoding, directions, and map rendering.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 15 (App Router), Tailwind CSS, TypeScript |
| UI Components | Radix UI / shadcn/ui, Lucide Icons |
| Maps & Charts | MapLibre GL, Recharts |
| Forms | React Hook Form, Zod |
| Storage | Local filesystem (dev) or Google Cloud Storage (prod) |
| Deployment | Docker, GCP Cloud Run, Terraform |
| External APIs | NextBillion.ai (geocoding, directions, autocomplete, map tiles) |

## Features

- **Dashboard** - Schedule timeline visualization, route map with job markers, daily stats
- **Gap Finder** - Identifies STRONG and TIGHT available windows across a configurable booking horizon
- **Viability Check** - Validates whether a lead postcode fits within a gap, accounting for drive times
- **Preference Filter** - Ranks viable slots by customer preferences (day, time of day, specific date)
- **Configuration** - All scheduling parameters are tunable: survey duration, working hours, buffer times, drive thresholds, timezone, and more
- **Map Proxy** - Server-side proxying of map tiles/sprites/glyphs to prevent API key leakage to the client

## Project Structure

```
src/
  app/
    api/                  # 19 REST API routes
    page.tsx              # Main SPA entry (tab-based navigation)
    layout.tsx            # Root layout with fonts
    globals.css           # Global styles and component classes
  components/
    dashboard/            # Dashboard, timeline, route map, stat cards
    gaps/                 # Gap finder view
    viability/            # Viability check with postcode autocomplete
    preferences/          # Preference filter and slot ranking
    config/               # Configuration panel (all system settings)
    layout/               # Sidebar, header
    ui/                   # Radix/shadcn primitives
  lib/
    storage/              # Pluggable storage (local FS or GCS)
    business/             # Core algorithms: gap-finder, viability, geocoding, timezone
    api-client.ts         # Typed fetch wrapper
  types/
    index.ts              # All TypeScript interfaces and default config
terraform/                # GCP infrastructure (Cloud Run, GCS, IAM, Artifact Registry)
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd schedule_finder

# Install dependencies
npm install

# Create environment file (optional - defaults work for local dev)
cp .env.example .env

# Start development server
npm run dev
```

The app runs at **http://localhost:3000**. On first load it auto-seeds demo schedule data for "Surveyor Sam" with two weeks of Birmingham-area jobs.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCS_BUCKET_NAME` | No | _(empty)_ | GCS bucket for production storage. When empty, uses local file storage. |
| `LOCAL_STORAGE_PATH` | No | `.data` | Directory for local JSON file storage |
| `NEXTBILLION_API_KEY` | No | _(empty)_ | Can also be set via the Configuration UI at runtime |

### NextBillion API Key

The app works without an API key using estimated drive times. For real geocoding, directions, and map tiles:

1. Get an API key from [NextBillion.ai](https://nextbillion.ai)
2. Enter it in the **Configuration** tab under "NextBillion API Key"
3. The key is stored server-side and never exposed to the client

## API Routes

### Dashboard & Config
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api` | Health check / liveness probe |
| `GET` | `/api/dashboard-stats?surveyor_id=` | Aggregate stats (jobs, gaps, density) |
| `GET/PUT` | `/api/config` | Read or update system configuration |
| `POST` | `/api/seed-data` | Re-seed demo schedule data |

### Schedule
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/schedule?surveyor_id=&date=` | List schedule entries (filterable) |
| `POST` | `/api/schedule` | Create a schedule entry |
| `GET/DELETE` | `/api/schedule/[id]` | Get or remove a specific entry |

### Surveyors
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/surveyors` | List all surveyors |
| `GET/PUT` | `/api/surveyors/[id]` | Get or update a surveyor |
| `POST` | `/api/surveyors` | Create a surveyor |

### Gap Finding & Viability
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/gaps?surveyor_id=` | Calculate available time slots |
| `POST` | `/api/viability-check` | Check if a postcode fits a specific gap |
| `POST` | `/api/viability-check-bulk` | Check all gaps for a given postcode |

### Location & Maps
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/geocode` | Convert postcode to lat/lng |
| `GET` | `/api/postcode-autocomplete?q=` | Typeahead postcode suggestions |
| `GET` | `/api/route-geometry` | Multi-stop route polyline and stats |
| `GET` | `/api/map-style` | Proxied MapLibre style JSON |
| `GET` | `/api/map-proxy/[...path]` | Proxied map tiles, sprites, glyphs |

### Preferences & API Key
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/preference-filter` | Rank slots by customer preferences |
| `POST` | `/api/api-key` | Store NextBillion API key |
| `GET` | `/api/api-key/status` | Check if API key is configured |

## Configuration Parameters

All parameters are editable from the Configuration tab:

**Franchise Operations** - Survey duration (90 min), working hours (08:00-18:00), booking window (14 days), buffer time (15 min each side), max long drives per day

**Distance-Based Gaps** - Long drive threshold (45 min), max drive time cap (75 min), drive time safety multiplier (1.15x)

**Territory Rules** - Dense day threshold (4+ jobs), sparse day threshold (2 jobs), dense day minimum gap (150 min)

**Timezone** - Configurable timezone for all date/time calculations (default: Europe/London)

## Storage

The app uses a pluggable storage layer with two providers:

- **Local** (default) - JSON files in `.data/` directory. No setup required.
- **Google Cloud Storage** - Set `GCS_BUCKET_NAME` to enable. Used in production with Cloud Run.

Data files:
```
config.json              # System configuration
api-keys.json            # API credentials (preserved across reseeds)
surveyors/index.json     # Surveyor profiles
schedule/index.json      # Booked jobs and time blocks
gaps/{surveyorId}.json   # Calculated available slots
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide. Summary:

```bash
# Build Docker image
docker build -t mtll-slot-engine .

# Or deploy to GCP with Terraform
cd terraform
terraform init
terraform apply -var="image_tag=$(git rev-parse --short HEAD)"
```

The Dockerfile uses a multi-stage build optimized for Next.js standalone output, running as a non-root user on Node 20 Alpine.

**Infrastructure (Terraform):**
- Cloud Run (europe-west2, scales 0-3 instances)
- GCS bucket with versioning (5 versions retained)
- Artifact Registry for Docker images
- IAM service account with `storage.objectAdmin`

## Development

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

Private - All rights reserved.
