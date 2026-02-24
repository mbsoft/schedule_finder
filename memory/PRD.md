# MTLL Slot Engine - Product Requirements Document

## Original Problem Statement
Build a web application version of the MTLL Slot Engine from an Excel file. The engine optimizes surveyor job scheduling by identifying available time slots, validating them against drive times, and filtering by customer preferences. Uses NextBillion's postcode geocode API for geocoding.

## User Personas
1. **Franchise Operations Manager (Rob/Liam)** - Configures system parameters, reviews scheduling efficiency
2. **Surveyor (Josh)** - Views their schedule, understands job flow
3. **Customer Service Rep** - Uses slot offers to book customer appointments

## Core Requirements (Static)
- Dashboard with surveyor schedule visualization
- Gap Finder (Layer 1) - identify available slot windows
- Viability Check (Layer 2) - drive time validation
- Preference Filter (Layer 3) - customer preference matching
- Master Configuration panel (editable settings)
- NextBillion API integration for geocoding
- Dark theme with timeline view

## Architecture
- **Frontend**: React 19 with Tailwind CSS, Sonner for toasts
- **Backend**: FastAPI with async MongoDB (Motor)
- **Database**: MongoDB
- **External API**: NextBillion Postcode Geocoding API

## What's Been Implemented (Feb 21, 2026)
### MVP Complete ✅
- [x] Dashboard with stats cards (Total Jobs, Available Gaps, Strong/Tight Slots)
- [x] Timeline visualization showing booked slots and available gaps
- [x] Date selector for viewing different days
- [x] Gap Finder with STRONG/TIGHT classification and filtering
- [x] Viability Check with postcode input and drive time validation
- [x] Preference Filter with day/time selection and ranked slot offers
- [x] Configuration panel with all settings from Excel:
  - Franchise Operations (survey duration, working hours, buffers, etc.)
  - Distance-Based Minimum Gaps (drive thresholds)
  - Territory Rules (dense/sparse day thresholds)
- [x] NextBillion API key management
- [x] Data seeded from Excel file (Josh's schedule)
- [x] Dark theme UI matching design guidelines

### NextBillion API Integration (Feb 24, 2026) ✅
- [x] **Postcode Geocoding API** - Converts UK postcodes to lat/lng coordinates
- [x] **Directions API** - Gets actual road-based drive times between locations
- [x] UI shows whether using "Road" times (API) or "Est" times (fallback)
- [x] 🛣️ indicator on drive times when using real road data

## API Endpoints
- `GET /api/dashboard-stats` - Get dashboard statistics
- `GET /api/schedule` - Get surveyor schedule
- `GET /api/gaps` - Calculate and return available gaps
- `POST /api/viability-check-bulk` - Check viability for all gaps
- `POST /api/preference-filter` - Filter and rank slots by preferences
- `GET/PUT /api/config` - Configuration management
- `POST /api/api-key` - Save NextBillion API key
- `POST /api/seed-data` - Seed demo data

## Prioritized Backlog

### P0 (Critical)
- [x] All MVP features implemented

### P1 (High Priority - Future)
- [ ] Real-time Breeze-It API integration for live schedule sync
- [ ] N8N webhook integration for automated slot updates
- [ ] Multi-surveyor support (add new surveyor profiles)
- [ ] GHL CRM integration for lead management

### P2 (Medium Priority)
- [ ] AI-managed settings with auto-tuning based on performance
- [ ] Blocked postcode pairs configuration
- [ ] Territory mapping visualization
- [ ] SMS/Email slot offer notifications

### P3 (Nice to Have)
- [ ] Calendar export (iCal)
- [ ] Historical performance analytics
- [ ] Mobile responsive design
- [ ] Customer self-booking portal

## Next Tasks
1. Connect to Breeze-It API for real schedule data
2. Add N8N workflow triggers
3. Implement GHL custom field syncing
4. Add multi-surveyor support with territory assignment
