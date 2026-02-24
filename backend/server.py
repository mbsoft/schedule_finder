from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class ConfigModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Franchise Operations
    survey_duration_mins: int = 90
    working_hours_start: str = "08:00"
    working_hours_end: str = "18:00"
    booking_window_days: int = 14
    min_lead_time_same_day_mins: int = 120
    buffer_mins_each_side: int = 15
    max_long_drives_per_day: int = 1
    long_drive_threshold_mins: int = 45
    max_drive_time_hard_cap_mins: int = 75
    weekends_available: bool = False
    max_slots_per_day_insert: int = 3
    # Distance-Based Minimum Gaps
    min_gap_nearby_mins: int = 120
    min_gap_medium_mins: int = 135
    min_gap_long_mins: int = 150
    nearby_miles_threshold: float = 10.0
    medium_miles_threshold: float = 20.0
    long_miles_threshold: float = 30.0
    # Territory Rules
    dense_day_threshold: int = 4
    sparse_day_threshold: int = 2
    dense_day_min_gap_mins: int = 150
    # AI Settings
    drive_time_safety_mult: float = 1.15
    preference_match_weight: float = 1.2
    sparse_day_priority_boost: float = 1.1
    min_conversion_gap_mins: int = 90
    updated_at: Optional[str] = None

class SurveyorModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    home_postcode: str
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None
    working_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    territory_postcodes: List[str] = []
    max_jobs_per_day: int = 5
    active: bool = True

class ScheduleEntryModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    surveyor_id: str
    date: str  # YYYY-MM-DD
    day_name: str
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    postcode: str
    job_type: str = "Survey"
    area: Optional[str] = None
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class GapModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    day_name: str
    gap_start: str
    gap_end: str
    gap_mins: int
    from_postcode: Optional[str] = None
    to_postcode: Optional[str] = None
    gap_type: str  # "STRONG", "TIGHT", "BLOCKED"
    classification: str
    notes: Optional[str] = None

class ViabilityCheckRequest(BaseModel):
    lead_postcode: str
    gap_id: str

class ViabilityResult(BaseModel):
    gap_id: str
    viable: bool
    reason: str
    required_window_mins: int
    available_gap_mins: int
    drive_time_from: Optional[int] = None
    drive_time_to: Optional[int] = None
    uses_long_drive: bool = False

class PreferenceFilterRequest(BaseModel):
    preferred_day: Optional[str] = None  # "Monday", "Friday", etc.
    time_of_day: Optional[str] = None  # "morning", "afternoon", "any"
    specific_date: Optional[str] = None  # YYYY-MM-DD

class SlotOffer(BaseModel):
    gap_id: str
    date: str
    day_name: str
    slot_start: str
    slot_end: str
    preference_match: bool
    rank: int
    area: Optional[str] = None

class ApiKeyModel(BaseModel):
    nextbillion_key: str

class GeocodeRequest(BaseModel):
    postcode: str
    country: str = "United Kingdom"

class GeocodeResult(BaseModel):
    postcode: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    success: bool
    error: Optional[str] = None

# ============== HELPER FUNCTIONS ==============

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM to minutes since midnight"""
    h, m = map(int, time_str.split(":"))
    return h * 60 + m

def minutes_to_time(mins: int) -> str:
    """Convert minutes since midnight to HH:MM"""
    h = mins // 60
    m = mins % 60
    return f"{h:02d}:{m:02d}"

async def get_config() -> dict:
    """Get current configuration from DB or return defaults"""
    config = await db.config.find_one({}, {"_id": 0})
    if not config:
        default_config = ConfigModel()
        config = default_config.model_dump()
        config['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.config.insert_one(config)
    return config

async def get_api_key() -> Optional[str]:
    """Get NextBillion API key from DB"""
    key_doc = await db.api_keys.find_one({}, {"_id": 0})
    if key_doc:
        return key_doc.get("nextbillion_key")
    return None

async def geocode_postcode(postcode: str, api_key: str) -> GeocodeResult:
    """Geocode a UK postcode using NextBillion API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.nextbillion.io/postalcode?key={api_key}",
                json={
                    "postalcode": postcode.replace(" ", ""),
                    "country": "United Kingdom"
                },
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("places") and len(data["places"]) > 0:
                    place = data["places"][0]
                    return GeocodeResult(
                        postcode=postcode,
                        lat=place.get("lat"),
                        lng=place.get("lng"),
                        success=True
                    )
            return GeocodeResult(
                postcode=postcode,
                success=False,
                error=f"API returned status {response.status_code}"
            )
    except Exception as e:
        logger.error(f"Geocode error for {postcode}: {str(e)}")
        return GeocodeResult(
            postcode=postcode,
            success=False,
            error=str(e)
        )

def calculate_drive_time_estimate(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> int:
    """Estimate drive time in minutes using Haversine distance (fallback when no API)"""
    import math
    R = 3959  # Earth radius in miles
    lat1, lng1, lat2, lng2 = map(math.radians, [from_lat, from_lng, to_lat, to_lng])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    distance_miles = R * c
    # Assume average 30 mph for UK suburban driving
    drive_time_mins = int((distance_miles / 30) * 60)
    return max(10, drive_time_mins)  # Minimum 10 mins

async def get_directions_drive_time(from_lat: float, from_lng: float, to_lat: float, to_lng: float, api_key: str) -> Optional[int]:
    """Get actual road-based drive time using NextBillion Directions API"""
    try:
        async with httpx.AsyncClient() as client:
            # Use NextBillion Directions API (Fast version)
            response = await client.get(
                f"https://api.nextbillion.io/directions/json",
                params={
                    "key": api_key,
                    "origin": f"{from_lat},{from_lng}",
                    "destination": f"{to_lat},{to_lng}",
                    "mode": "car"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                # Extract duration from response (in seconds)
                if data.get("routes") and len(data["routes"]) > 0:
                    route = data["routes"][0]
                    # Duration is in seconds, convert to minutes
                    duration_seconds = route.get("duration", 0)
                    duration_mins = int(duration_seconds / 60)
                    logger.info(f"Directions API: {from_lat},{from_lng} -> {to_lat},{to_lng} = {duration_mins} mins")
                    return max(5, duration_mins)  # Minimum 5 mins
            
            logger.warning(f"Directions API returned status {response.status_code}: {response.text[:200]}")
            return None
            
    except Exception as e:
        logger.error(f"Directions API error: {str(e)}")
        return None

async def get_drive_time(from_lat: float, from_lng: float, to_lat: float, to_lng: float, api_key: Optional[str]) -> tuple[int, bool]:
    """
    Get drive time between two points.
    Returns: (drive_time_mins, used_directions_api)
    """
    if api_key:
        # Try Directions API first for accurate road-based times
        directions_time = await get_directions_drive_time(from_lat, from_lng, to_lat, to_lng, api_key)
        if directions_time is not None:
            return (directions_time, True)
    
    # Fallback to Haversine estimate
    estimate = calculate_drive_time_estimate(from_lat, from_lng, to_lat, to_lng)
    return (estimate, False)

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "MTLL Slot Engine API v1.0"}

# --- Config Routes ---
@api_router.get("/config")
async def get_configuration():
    config = await get_config()
    return config

@api_router.put("/config")
async def update_configuration(config_update: Dict[str, Any]):
    config_update['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.config.update_one({}, {"$set": config_update}, upsert=True)
    return await get_config()

# --- API Key Routes ---
@api_router.post("/api-key")
async def save_api_key(key_data: ApiKeyModel):
    await db.api_keys.update_one(
        {},
        {"$set": {"nextbillion_key": key_data.nextbillion_key}},
        upsert=True
    )
    return {"success": True, "message": "API key saved"}

@api_router.get("/api-key/status")
async def get_api_key_status():
    key = await get_api_key()
    return {"has_key": key is not None and len(key) > 0}

# --- Surveyor Routes ---
@api_router.get("/surveyors")
async def get_surveyors():
    surveyors = await db.surveyors.find({}, {"_id": 0}).to_list(100)
    return surveyors

@api_router.get("/surveyors/{surveyor_id}")
async def get_surveyor(surveyor_id: str):
    surveyor = await db.surveyors.find_one({"id": surveyor_id}, {"_id": 0})
    if not surveyor:
        raise HTTPException(status_code=404, detail="Surveyor not found")
    return surveyor

@api_router.post("/surveyors")
async def create_surveyor(surveyor: SurveyorModel):
    doc = surveyor.model_dump()
    await db.surveyors.insert_one(doc)
    return doc

@api_router.put("/surveyors/{surveyor_id}")
async def update_surveyor(surveyor_id: str, updates: Dict[str, Any]):
    await db.surveyors.update_one({"id": surveyor_id}, {"$set": updates})
    return await db.surveyors.find_one({"id": surveyor_id}, {"_id": 0})

# --- Schedule Routes ---
@api_router.get("/schedule")
async def get_schedule(surveyor_id: Optional[str] = None, date: Optional[str] = None):
    query = {}
    if surveyor_id:
        query["surveyor_id"] = surveyor_id
    if date:
        query["date"] = date
    schedule = await db.schedule.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return schedule

@api_router.post("/schedule")
async def create_schedule_entry(entry: ScheduleEntryModel):
    doc = entry.model_dump()
    await db.schedule.insert_one(doc)
    return doc

@api_router.delete("/schedule/{entry_id}")
async def delete_schedule_entry(entry_id: str):
    result = await db.schedule.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

# --- Gap Finder (Layer 1) ---
@api_router.get("/gaps")
async def find_gaps(surveyor_id: str):
    """Find all available gaps in surveyor's schedule"""
    config = await get_config()
    surveyor = await db.surveyors.find_one({"id": surveyor_id}, {"_id": 0})
    if not surveyor:
        raise HTTPException(status_code=404, detail="Surveyor not found")
    
    # Get schedule entries sorted by date and time
    schedule = await db.schedule.find(
        {"surveyor_id": surveyor_id},
        {"_id": 0}
    ).sort([("date", 1), ("start_time", 1)]).to_list(1000)
    
    gaps = []
    work_start = time_to_minutes(config["working_hours_start"])
    work_end = time_to_minutes(config["working_hours_end"])
    survey_duration = config["survey_duration_mins"]
    buffer = config["buffer_mins_each_side"]
    required_window = survey_duration + (buffer * 2) + 30  # 30 min travel estimate
    
    # Group schedule by date
    schedule_by_date = {}
    for entry in schedule:
        date = entry["date"]
        if date not in schedule_by_date:
            schedule_by_date[date] = []
        schedule_by_date[date].append(entry)
    
    # Generate dates for booking window
    today = datetime.now(timezone.utc).date()
    for day_offset in range(config["booking_window_days"]):
        check_date = today + timedelta(days=day_offset)
        date_str = check_date.strftime("%Y-%m-%d")
        day_name = check_date.strftime("%A")
        
        # Skip weekends if not available
        if not config["weekends_available"] and day_name in ["Saturday", "Sunday"]:
            continue
        
        day_schedule = schedule_by_date.get(date_str, [])
        day_schedule.sort(key=lambda x: time_to_minutes(x["start_time"]))
        
        # Count jobs to determine density
        job_count = len([e for e in day_schedule if e.get("job_type") != "BLOCK"])
        is_dense = job_count >= config["dense_day_threshold"]
        is_sparse = job_count <= config["sparse_day_threshold"]
        
        # Find gaps
        current_time = work_start
        prev_postcode = surveyor.get("home_postcode", "")
        
        for i, entry in enumerate(day_schedule):
            entry_start = time_to_minutes(entry["start_time"])
            entry_end = time_to_minutes(entry["end_time"])
            
            gap_mins = entry_start - current_time
            
            if gap_mins >= required_window:
                # Determine gap type
                if gap_mins >= required_window + 60:
                    gap_type = "STRONG"
                    classification = "STRONG OPPORTUNITY"
                elif gap_mins >= required_window:
                    gap_type = "TIGHT"
                    classification = "TIGHT - VIABLE"
                else:
                    gap_type = "BLOCKED"
                    classification = "TOO SMALL"
                
                next_postcode = entry.get("postcode", "")
                
                gap = GapModel(
                    date=date_str,
                    day_name=day_name,
                    gap_start=minutes_to_time(current_time),
                    gap_end=minutes_to_time(entry_start),
                    gap_mins=gap_mins,
                    from_postcode=prev_postcode,
                    to_postcode=next_postcode,
                    gap_type=gap_type,
                    classification=classification,
                    notes=f"{'Dense day' if is_dense else 'Sparse day' if is_sparse else 'Normal day'}"
                )
                gaps.append(gap.model_dump())
            
            current_time = entry_end
            prev_postcode = entry.get("postcode", "")
        
        # Check gap after last job until work end
        gap_mins = work_end - current_time
        if gap_mins >= required_window:
            if gap_mins >= required_window + 60:
                gap_type = "STRONG"
                classification = "STRONG OPPORTUNITY"
            else:
                gap_type = "TIGHT"
                classification = "TIGHT - VIABLE"
            
            gap = GapModel(
                date=date_str,
                day_name=day_name,
                gap_start=minutes_to_time(current_time),
                gap_end=minutes_to_time(work_end),
                gap_mins=gap_mins,
                from_postcode=prev_postcode,
                to_postcode=surveyor.get("home_postcode", ""),
                gap_type=gap_type,
                classification=classification,
                notes=f"End of day slot"
            )
            gaps.append(gap.model_dump())
    
    # Store gaps in DB for reference (without returning _id)
    await db.gaps.delete_many({"surveyor_id": surveyor_id})
    for gap in gaps:
        gap["surveyor_id"] = surveyor_id
        await db.gaps.insert_one(gap.copy())  # Use copy to avoid _id mutation
    
    return gaps

# --- Viability Check (Layer 2) ---
@api_router.post("/viability-check")
async def check_viability(request: ViabilityCheckRequest):
    """Check if a gap is viable for a specific lead postcode"""
    config = await get_config()
    api_key = await get_api_key()
    
    # Get the gap
    gap = await db.gaps.find_one({"id": request.gap_id}, {"_id": 0})
    if not gap:
        raise HTTPException(status_code=404, detail="Gap not found")
    
    survey_duration = config["survey_duration_mins"]
    buffer = config["buffer_mins_each_side"]
    hard_cap = config["max_drive_time_hard_cap_mins"]
    long_threshold = config["long_drive_threshold_mins"]
    safety_mult = config["drive_time_safety_mult"]
    
    # Estimate drive times (use geocoding if API key available)
    drive_time_from = 20  # Default estimate
    drive_time_to = 20
    
    if api_key:
        # Geocode lead postcode
        lead_geo = await geocode_postcode(request.lead_postcode, api_key)
        
        if lead_geo.success and lead_geo.lat and lead_geo.lng:
            # Get coordinates for from/to postcodes
            if gap.get("from_postcode"):
                from_geo = await geocode_postcode(gap["from_postcode"], api_key)
                if from_geo.success and from_geo.lat and from_geo.lng:
                    drive_time_from = calculate_drive_time_estimate(
                        from_geo.lat, from_geo.lng,
                        lead_geo.lat, lead_geo.lng
                    )
            
            if gap.get("to_postcode"):
                to_geo = await geocode_postcode(gap["to_postcode"], api_key)
                if to_geo.success and to_geo.lat and to_geo.lng:
                    drive_time_to = calculate_drive_time_estimate(
                        lead_geo.lat, lead_geo.lng,
                        to_geo.lat, to_geo.lng
                    )
    
    # Apply safety multiplier
    drive_time_from = int(drive_time_from * safety_mult)
    drive_time_to = int(drive_time_to * safety_mult)
    
    # Calculate required window
    required_window = drive_time_from + buffer + survey_duration + buffer + drive_time_to
    available_gap = gap["gap_mins"]
    
    # Check viability
    viable = True
    reason = "VIABLE"
    uses_long_drive = False
    
    if available_gap < required_window:
        viable = False
        reason = f"Gap too small ({available_gap}min < {required_window}min required)"
    elif drive_time_from > hard_cap or drive_time_to > hard_cap:
        viable = False
        reason = f"Drive time exceeds hard cap ({hard_cap}min)"
    elif drive_time_from > long_threshold or drive_time_to > long_threshold:
        uses_long_drive = True
        reason = "VIABLE - Uses long drive allowance"
    
    return ViabilityResult(
        gap_id=request.gap_id,
        viable=viable,
        reason=reason,
        required_window_mins=required_window,
        available_gap_mins=available_gap,
        drive_time_from=drive_time_from,
        drive_time_to=drive_time_to,
        uses_long_drive=uses_long_drive
    )

# --- Bulk Viability Check ---
@api_router.post("/viability-check-bulk")
async def check_viability_bulk(lead_postcode: str, surveyor_id: str):
    """Check viability for all gaps against a lead postcode"""
    gaps = await db.gaps.find({"surveyor_id": surveyor_id}, {"_id": 0}).to_list(1000)
    results = []
    
    for gap in gaps:
        if gap["gap_type"] != "BLOCKED":
            request = ViabilityCheckRequest(lead_postcode=lead_postcode, gap_id=gap["id"])
            result = await check_viability(request)
            results.append({**result.model_dump(), "gap": gap})
    
    return results

# --- Preference Filter (Layer 3) ---
@api_router.post("/preference-filter")
async def filter_by_preferences(request: PreferenceFilterRequest, surveyor_id: str):
    """Filter viable gaps by customer preferences"""
    config = await get_config()
    gaps = await db.gaps.find(
        {"surveyor_id": surveyor_id, "gap_type": {"$ne": "BLOCKED"}},
        {"_id": 0}
    ).to_list(1000)
    
    offers = []
    rank = 0
    
    # Define time periods
    morning_end = time_to_minutes("12:00")
    afternoon_start = time_to_minutes("12:00")
    afternoon_end = time_to_minutes("17:00")
    
    for gap in gaps:
        gap_start_mins = time_to_minutes(gap["gap_start"])
        preference_match = True
        
        # Check day preference
        if request.preferred_day and gap["day_name"].lower() != request.preferred_day.lower():
            preference_match = False
        
        # Check specific date
        if request.specific_date and gap["date"] != request.specific_date:
            preference_match = False
        
        # Check time of day preference
        if request.time_of_day:
            if request.time_of_day.lower() == "morning" and gap_start_mins >= morning_end:
                preference_match = False
            elif request.time_of_day.lower() == "afternoon" and (gap_start_mins < afternoon_start or gap_start_mins >= afternoon_end):
                preference_match = False
        
        # Calculate slot times (middle of gap, accounting for travel)
        buffer = config["buffer_mins_each_side"]
        survey_duration = config["survey_duration_mins"]
        slot_start_mins = gap_start_mins + 20 + buffer  # 20 min travel estimate
        slot_end_mins = slot_start_mins + survey_duration
        
        rank += 1
        offer = SlotOffer(
            gap_id=gap["id"],
            date=gap["date"],
            day_name=gap["day_name"],
            slot_start=minutes_to_time(slot_start_mins),
            slot_end=minutes_to_time(slot_end_mins),
            preference_match=preference_match,
            rank=rank if preference_match else rank + 100,
            area=gap.get("notes")
        )
        offers.append(offer.model_dump())
    
    # Sort by rank (preference matches first)
    offers.sort(key=lambda x: (not x["preference_match"], x["rank"]))
    
    # Re-rank
    for i, offer in enumerate(offers):
        offer["rank"] = i + 1
    
    return offers

# --- Geocode Route ---
@api_router.post("/geocode")
async def geocode(request: GeocodeRequest):
    """Geocode a postcode using NextBillion API"""
    api_key = await get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="NextBillion API key not configured")
    
    result = await geocode_postcode(request.postcode, api_key)
    return result

# --- Seed Data Route ---
@api_router.post("/seed-data")
async def seed_data():
    """Seed the database with Josh's schedule from the Excel file"""
    # Clear existing data
    await db.surveyors.delete_many({})
    await db.schedule.delete_many({})
    await db.config.delete_many({})
    await db.gaps.delete_many({})
    
    # Create default config
    config = ConfigModel()
    config_doc = config.model_dump()
    config_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.config.insert_one(config_doc)
    
    # Create Josh surveyor
    josh = SurveyorModel(
        id="josh-001",
        name="Josh",
        home_postcode="B15 2TT",
        working_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        territory_postcodes=["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12", "B13", "B14", "B15", "WS", "WV"],
        max_jobs_per_day=5,
        active=True
    )
    await db.surveyors.insert_one(josh.model_dump())
    
    # Seed Josh's schedule from Excel data
    # Based on the Excel file data
    today = datetime.now(timezone.utc).date()
    schedule_data = [
        # Day 1 - Monday - Dense day
        {"offset": 0, "day": "Monday", "entries": [
            {"start": "08:30", "end": "10:00", "postcode": "B15 2QH", "type": "Survey", "area": "Birmingham Central"},
            {"start": "10:30", "end": "12:00", "postcode": "B16 8QY", "type": "Survey", "area": "Edgbaston"},
            {"start": "13:00", "end": "14:30", "postcode": "B17 8JR", "type": "Survey", "area": "Harborne"},
            {"start": "15:30", "end": "17:00", "postcode": "B29 6NQ", "type": "Survey", "area": "Selly Oak"},
        ]},
        # Day 2 - Tuesday - Moderate day
        {"offset": 1, "day": "Tuesday", "entries": [
            {"start": "09:00", "end": "10:30", "postcode": "WS1 2EN", "type": "Survey", "area": "Walsall"},
            {"start": "12:00", "end": "13:30", "postcode": "WS3 3LH", "type": "Survey", "area": "Bloxwich"},
            {"start": "15:00", "end": "16:30", "postcode": "WV1 1ST", "type": "Survey", "area": "Wolverhampton"},
        ]},
        # Day 3 - Wednesday - Sparse day
        {"offset": 2, "day": "Wednesday", "entries": [
            {"start": "10:00", "end": "11:30", "postcode": "B23 6TL", "type": "Survey", "area": "Erdington"},
            {"start": "14:00", "end": "15:30", "postcode": "B24 9PP", "type": "Survey", "area": "Erdington North"},
        ]},
        # Day 4 - Thursday - Moderate day with block
        {"offset": 3, "day": "Thursday", "entries": [
            {"start": "08:30", "end": "10:00", "postcode": "B31 2PA", "type": "Survey", "area": "Northfield"},
            {"start": "11:00", "end": "12:30", "postcode": "B32 1HJ", "type": "Survey", "area": "Quinton"},
            {"start": "13:30", "end": "15:00", "postcode": "NO POSTCODE", "type": "BLOCK", "area": "Personal", "notes": "Doctor appointment"},
        ]},
        # Day 5 - Friday - Light day
        {"offset": 4, "day": "Friday", "entries": [
            {"start": "09:30", "end": "11:00", "postcode": "B44 8NU", "type": "Survey", "area": "Perry Barr"},
            {"start": "14:30", "end": "16:00", "postcode": "B42 2PP", "type": "Survey", "area": "Great Barr"},
        ]},
        # Week 2
        # Day 8 - Monday
        {"offset": 7, "day": "Monday", "entries": [
            {"start": "08:30", "end": "10:00", "postcode": "B5 7RN", "type": "Survey", "area": "Digbeth"},
            {"start": "11:00", "end": "12:30", "postcode": "B9 4AA", "type": "Survey", "area": "Bordesley Green"},
            {"start": "14:00", "end": "15:30", "postcode": "B10 0NP", "type": "Survey", "area": "Small Heath"},
        ]},
        # Day 9 - Tuesday
        {"offset": 8, "day": "Tuesday", "entries": [
            {"start": "09:00", "end": "10:30", "postcode": "WS2 8EZ", "type": "Survey", "area": "Walsall South"},
            {"start": "13:00", "end": "14:30", "postcode": "WS5 4NR", "type": "Survey", "area": "Palfrey"},
        ]},
        # Day 10 - Wednesday - Very sparse
        {"offset": 9, "day": "Wednesday", "entries": [
            {"start": "11:00", "end": "12:30", "postcode": "B13 8RD", "type": "Survey", "area": "Moseley"},
        ]},
        # Day 11 - Thursday
        {"offset": 10, "day": "Thursday", "entries": [
            {"start": "08:30", "end": "10:00", "postcode": "B14 6NH", "type": "Survey", "area": "Kings Heath"},
            {"start": "11:30", "end": "13:00", "postcode": "B30 3HX", "type": "Survey", "area": "Stirchley"},
            {"start": "15:00", "end": "16:30", "postcode": "B38 8RU", "type": "Survey", "area": "Kings Norton"},
        ]},
        # Day 12 - Friday
        {"offset": 11, "day": "Friday", "entries": [
            {"start": "10:00", "end": "11:30", "postcode": "B26 3QJ", "type": "Survey", "area": "Sheldon"},
            {"start": "14:00", "end": "15:30", "postcode": "B33 8TH", "type": "Survey", "area": "Kitts Green"},
        ]},
    ]
    
    for day_data in schedule_data:
        date = today + timedelta(days=day_data["offset"])
        # Skip weekends
        if date.strftime("%A") in ["Saturday", "Sunday"]:
            continue
        
        date_str = date.strftime("%Y-%m-%d")
        for entry in day_data["entries"]:
            schedule_entry = ScheduleEntryModel(
                surveyor_id="josh-001",
                date=date_str,
                day_name=day_data["day"],
                start_time=entry["start"],
                end_time=entry["end"],
                postcode=entry["postcode"],
                job_type=entry["type"],
                area=entry.get("area"),
                notes=entry.get("notes")
            )
            await db.schedule.insert_one(schedule_entry.model_dump())
    
    return {"success": True, "message": "Data seeded successfully"}

# --- Dashboard Stats ---
@api_router.get("/dashboard-stats")
async def get_dashboard_stats(surveyor_id: str):
    """Get dashboard statistics for a surveyor"""
    config = await get_config()
    
    # Get schedule
    schedule = await db.schedule.find({"surveyor_id": surveyor_id}, {"_id": 0}).to_list(1000)
    
    # Get gaps
    gaps = await db.gaps.find({"surveyor_id": surveyor_id}, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    total_jobs = len([e for e in schedule if e.get("job_type") != "BLOCK"])
    total_gaps = len(gaps)
    strong_gaps = len([g for g in gaps if g.get("gap_type") == "STRONG"])
    tight_gaps = len([g for g in gaps if g.get("gap_type") == "TIGHT"])
    
    # Jobs by day
    jobs_by_day = {}
    for entry in schedule:
        day = entry.get("day_name", "Unknown")
        if day not in jobs_by_day:
            jobs_by_day[day] = 0
        if entry.get("job_type") != "BLOCK":
            jobs_by_day[day] += 1
    
    # Find dense and sparse days
    dense_days = [day for day, count in jobs_by_day.items() if count >= config["dense_day_threshold"]]
    sparse_days = [day for day, count in jobs_by_day.items() if count <= config["sparse_day_threshold"]]
    
    return {
        "total_jobs": total_jobs,
        "total_gaps": total_gaps,
        "strong_gaps": strong_gaps,
        "tight_gaps": tight_gaps,
        "jobs_by_day": jobs_by_day,
        "dense_days": dense_days,
        "sparse_days": sparse_days,
        "booking_window_days": config["booking_window_days"],
        "config": config
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
