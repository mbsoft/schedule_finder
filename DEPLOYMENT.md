# MTLL Slot Engine - Deployment Guide

## Architecture Overview

```
                  +------------------+
                  |   Cloud Run      |
                  |  (Next.js app)   |
                  |  standalone mode |
                  +--------+---------+
                           |
              +------------+------------+
              |                         |
    +---------v---------+    +----------v----------+
    |  GCS Bucket       |    |  NextBillion.ai API |
    |  (config, schedule|    |  (geocoding,        |
    |   data, API key)  |    |   directions,       |
    +-------------------+    |   autocomplete)     |
                             +---------------------+
```

- **Next.js 15** with `output: 'standalone'` for minimal Docker images
- **Google Cloud Run** for serverless container hosting (scales 0-3 instances)
- **Google Cloud Storage** for persistent data (schedule, config, API keys)
- **Artifact Registry** for Docker image storage
- **NextBillion.ai** for external geocoding/directions API

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Terraform >= 1.5
- Docker
- Node.js 20+

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GCS_BUCKET_NAME` | Production | GCS bucket for persistent storage. When empty, falls back to local `.data/` directory |
| `NEXTBILLION_API_KEY` | Optional | Can also be set via the Configuration UI at runtime |
| `NODE_ENV` | Auto | Set to `production` by Terraform |

## Step 1: Provision Infrastructure with Terraform

```bash
cd terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your GCP project ID and optional API key

terraform init
terraform plan
terraform apply
```

This creates:
- **Artifact Registry** repository for Docker images
- **Cloud Run** service (europe-west2, 1 CPU / 512MB, scales 0-3)
- **GCS bucket** with versioning (keeps 5 versions) for data persistence
- **Service account** with `storage.objectAdmin` on the bucket
- **Public access** via `allUsers` invoker IAM binding

Terraform outputs the service URL, bucket name, registry URL, and service account email.

## Step 2: Build and Push Docker Image

Images are tagged with the git short hash for traceability, plus `latest` as a convenience alias.

```bash
# Get registry URL from Terraform output
REGISTRY=$(cd terraform && terraform output -raw artifact_registry)
GIT_SHA=$(git rev-parse --short HEAD)

# Authenticate Docker with Artifact Registry
gcloud auth configure-docker europe-west2-docker.pkg.dev

# Build and tag with git hash + latest
docker build --platform linux/amd64 \
  -t ${REGISTRY}/mtll-slot-engine:${GIT_SHA} \
  -t ${REGISTRY}/mtll-slot-engine:latest .

# Push both tags
docker push ${REGISTRY}/mtll-slot-engine:${GIT_SHA}
docker push ${REGISTRY}/mtll-slot-engine:latest
```

The Dockerfile uses a multi-stage build:
1. **deps** - installs node_modules
2. **builder** - runs `next build` producing standalone output
3. **runner** - copies only standalone artifacts, runs as non-root `nextjs` user

## Step 3: Deploy to Cloud Run

Pass the git hash as the `image_tag` variable so Terraform deploys the exact revision:

```bash
GIT_SHA=$(git rev-parse --short HEAD)

terraform apply -var="image_tag=${GIT_SHA}"
```

This ensures Cloud Run runs the image matching the committed code. The `image_tag` variable defaults to `latest` if not specified.

## Step 4: Seed Initial Data

Once deployed, seed the demo schedule data:

```bash
SERVICE_URL=$(cd terraform && terraform output -raw service_url)
curl -X POST ${SERVICE_URL}/api/seed-data
```

The NextBillion API key can be configured via the app's Configuration page, or pre-set in `terraform.tfvars`.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (uses local .data/ directory for storage)
npm run dev
```

No GCS bucket or API keys are required for local development. The storage layer automatically falls back to the local filesystem when `GCS_BUCKET_NAME` is not set.

## Storage Behaviour

| Environment | `GCS_BUCKET_NAME` | Storage |
|---|---|---|
| Local dev | empty | `.data/` directory (JSON files) |
| Production | set | GCS bucket with versioned objects |

Both backends implement the same `StorageProvider` interface, so the app behaves identically in both environments.

## Health Checks

Cloud Run is configured with:
- **Startup probe**: `GET /api` every 5s, 3 attempts, 5s initial delay
- **Liveness probe**: `GET /api` every 30s

## Updating the Deployment

```bash
# 1. Make changes locally, test, and commit
npm run dev
git add . && git commit -m "your changes"

# 2. Build and push new image tagged with git hash
REGISTRY=$(cd terraform && terraform output -raw artifact_registry)
GIT_SHA=$(git rev-parse --short HEAD)
docker build --platform linux/amd64 \
  -t ${REGISTRY}/mtll-slot-engine:${GIT_SHA} \
  -t ${REGISTRY}/mtll-slot-engine:latest .
docker push ${REGISTRY}/mtll-slot-engine:${GIT_SHA}
docker push ${REGISTRY}/mtll-slot-engine:latest

# 3. Deploy new revision via Terraform
cd terraform && terraform apply -var="image_tag=${GIT_SHA}"
```

## Cost Considerations

- **Cloud Run**: Scale-to-zero means no cost when idle. Billed per request/CPU-second.
- **GCS**: Minimal cost for small JSON config files. Versioning retains up to 5 versions.
- **Artifact Registry**: Storage cost for Docker images only.
- **NextBillion.ai**: External API with its own billing (rate limit: 2400 req/min).
