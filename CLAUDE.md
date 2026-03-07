# MTLL Slot Engine - Claude Code Guide

## Project Overview

A Next.js 15 scheduling tool ("slot engine") for field surveyors. It finds viable appointment gaps in a surveyor's schedule, checks drive-time viability for lead postcodes, and ranks slots by preference. Deployed on Google Cloud Run backed by GCS.

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom dark theme, shadcn/ui components
- **Mapping**: MapLibre GL (via map proxy to hide API key)
- **Storage**: GCS in production, local `.data/` JSON files in development
- **External API**: NextBillion.ai for geocoding, directions, postcode autocomplete
- **IaC**: Terraform (GCP — Cloud Run, GCS, Artifact Registry)

## Commands

```bash
npm run dev        # Start local dev server (port 3000)
npm run build      # Build for production
npm run lint       # Run ESLint
```

## Key Architecture

### Storage Layer
- `src/lib/storage/index.ts` — selects GCS or local provider based on `GCS_BUCKET_NAME` env var
- Local dev uses `.data/` directory (auto-created, gitignored)
- Production uses GCS bucket `nextbillion-se-team-slot-engine-data`

### API Routes (`src/app/api/`)
- `/config` — GET/PUT app configuration
- `/gaps` — GET computed gaps for a surveyor
- `/viability-check-bulk` — POST, reads `lead_postcode` and `surveyor_id` from query string (not body)
- `/map-proxy/[...path]` — proxies map tile requests to hide API key
- `/seed-data` — POST to seed demo schedule data

### Business Logic (`src/lib/business/`)
- `gap-finder.ts` — finds schedule gaps within booking window
- `viability.ts` — checks if a lead postcode fits in a gap (drive time aware)
- `drive-time.ts` — haversine distance estimate (stores distances internally in miles)
- `geocoding.ts` — wraps NextBillion geocoding + directions APIs

### Types (`src/types/index.ts`)
- `Config` — all app settings including `timezone` and `units` ('metric'|'imperial')
- Distance threshold fields (`nearby_miles_threshold` etc.) stored in miles internally; UI converts for display

## Hardcoded Surveyor ID

The single surveyor is `sam-001` throughout the codebase. All API calls use this ID.

## Units of Measure

- `Config.units` defaults to `'metric'`
- Distance thresholds stored in miles; converted to km for display when metric
- Route map distance display respects `units` from config
- Conversion: 1 mile = 1.60934 km

## Environment Variables

| Variable | Description |
|---|---|
| `GCS_BUCKET_NAME` | Production GCS bucket. Unset = local `.data/` storage |
| `NEXTBILLION_API_KEY` | Optional at startup; can be set via UI config page |
| `NODE_ENV` | Set to `production` by Docker/Terraform |

## Deployment

**GCP project**: `nextbillion-se-team`
**Region**: `us-central1`
**Service URL**: `https://mtll-slot-engine-rohbynxveq-uc.a.run.app`
**Registry**: `us-central1-docker.pkg.dev/nextbillion-se-team/mtll-slot-engine`

### Deploy a new version

```bash
REGISTRY=us-central1-docker.pkg.dev/nextbillion-se-team/mtll-slot-engine
GIT_SHA=$(git rev-parse --short HEAD)

docker build --platform linux/amd64 \
  -t ${REGISTRY}/mtll-slot-engine:${GIT_SHA} \
  -t ${REGISTRY}/mtll-slot-engine:latest .

docker push ${REGISTRY}/mtll-slot-engine:${GIT_SHA}
docker push ${REGISTRY}/mtll-slot-engine:latest

cd terraform && terraform apply -var="project_id=nextbillion-se-team" -var="image_tag=${GIT_SHA}"
```

### Terraform state note

Resources were imported manually (not created by Terraform). If re-initialising state, import with:

```bash
terraform import -var="project_id=nextbillion-se-team" google_artifact_registry_repository.app projects/nextbillion-se-team/locations/us-central1/repositories/mtll-slot-engine
terraform import -var="project_id=nextbillion-se-team" google_storage_bucket.data nextbillion-se-team-slot-engine-data
terraform import -var="project_id=nextbillion-se-team" google_service_account.cloud_run projects/nextbillion-se-team/serviceAccounts/mtll-slot-engine-sa@nextbillion-se-team.iam.gserviceaccount.com
terraform import -var="project_id=nextbillion-se-team" google_cloud_run_v2_service.app projects/nextbillion-se-team/locations/us-central1/services/mtll-slot-engine
```
