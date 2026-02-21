import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Calendar, Settings, MapPin, Clock, ChevronRight, 
  Search, Filter, RefreshCw, Key, Zap, Target,
  AlertTriangle, CheckCircle, XCircle, Loader2, 
  LayoutDashboard, Users, Gauge, TrendingUp
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============== SIDEBAR COMPONENT ==============
const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "gaps", label: "Gap Finder", icon: Target },
    { id: "viability", label: "Viability Check", icon: Gauge },
    { id: "preferences", label: "Preference Filter", icon: Filter },
    { id: "config", label: "Configuration", icon: Settings },
  ];

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="p-6 border-b border-[#27272a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#d4f64d] flex items-center justify-center">
            <Zap size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">MTLL SLOT</h1>
            <p className="text-xs text-[#a1a1aa]">ENGINE v3</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 p-3 bg-[#27272a] rounded-lg mb-6">
          <img 
            src="https://images.pexels.com/photos/3776969/pexels-photo-3776969.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100" 
            alt="Josh" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-sm">Josh</p>
            <p className="text-xs text-[#a1a1aa]">Active Surveyor</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-[#d4f64d]/10 text-[#d4f64d] border border-[#d4f64d]/30"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#27272a]">
        <div className="text-xs text-[#a1a1aa] text-center">
          Powered by NextBillion API
        </div>
      </div>
    </aside>
  );
};

// ============== STAT CARD COMPONENT ==============
const StatCard = ({ value, label, icon: Icon, color = "#d4f64d" }) => (
  <div className="stat-card" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      {Icon && <Icon size={24} className="text-[#a1a1aa]" />}
    </div>
  </div>
);

// ============== TIMELINE COMPONENT ==============
const Timeline = ({ schedule, gaps, date, onGapClick }) => {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 to 18:00
  const totalMinutes = 10 * 60; // 10 hours in minutes
  
  const getPosition = (time) => {
    const [h, m] = time.split(":").map(Number);
    const minutesFromStart = (h - 8) * 60 + m;
    return (minutesFromStart / totalMinutes) * 100;
  };

  const getWidth = (start, end) => {
    const startPos = getPosition(start);
    const endPos = getPosition(end);
    return endPos - startPos;
  };

  const daySchedule = schedule.filter(s => s.date === date);
  const dayGaps = gaps.filter(g => g.date === date);

  // Current time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimePos = currentHour >= 8 && currentHour < 18 
    ? getPosition(`${currentHour}:${currentMin.toString().padStart(2, '0')}`)
    : null;

  return (
    <div className="timeline-container" data-testid="timeline">
      <div className="timeline-header">
        {hours.map(hour => (
          <div key={hour} className="timeline-hour">
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>
      
      <div className="timeline-row relative">
        {/* Time grid lines */}
        {hours.map(hour => (
          <div 
            key={hour}
            className="absolute top-0 bottom-0 w-px bg-[#27272a]"
            style={{ left: `${((hour - 8) / 10) * 100}%` }}
          />
        ))}
        
        {/* Current time indicator */}
        {currentTimePos !== null && (
          <div 
            className="current-time-indicator"
            style={{ left: `${currentTimePos}%` }}
          />
        )}

        {/* Schedule entries */}
        {daySchedule.map((entry, idx) => (
          <div
            key={idx}
            className={`timeline-slot ${entry.job_type === 'BLOCK' ? 'block' : 'busy'}`}
            style={{
              left: `${getPosition(entry.start_time)}%`,
              width: `${getWidth(entry.start_time, entry.end_time)}%`,
            }}
            title={`${entry.start_time}-${entry.end_time}: ${entry.area || entry.postcode}`}
          >
            <span className="truncate text-xs">
              {entry.job_type === 'BLOCK' ? 'BLOCKED' : entry.area || entry.postcode}
            </span>
          </div>
        ))}

        {/* Gap indicators */}
        {dayGaps.map((gap, idx) => (
          <div
            key={`gap-${idx}`}
            className={`timeline-slot ${gap.gap_type === 'STRONG' ? 'gap-strong' : 'gap-tight'}`}
            style={{
              left: `${getPosition(gap.gap_start)}%`,
              width: `${getWidth(gap.gap_start, gap.gap_end)}%`,
            }}
            onClick={() => onGapClick?.(gap)}
            title={`Gap: ${gap.gap_start}-${gap.gap_end} (${gap.gap_mins}min)`}
          >
            <span className="truncate text-xs">
              {gap.gap_mins}min
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== DASHBOARD VIEW ==============
const DashboardView = ({ stats, schedule, gaps, onRefresh, loading }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Get unique dates from schedule
  const dates = [...new Set(schedule.map(s => s.date))].sort();
  
  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  return (
    <div className="space-y-6 animate-slide-in" data-testid="dashboard-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DASHBOARD</h2>
          <p className="text-sm text-[#a1a1aa]">Josh's Schedule Overview</p>
        </div>
        <button 
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          data-testid="refresh-btn"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard value={stats.total_jobs || 0} label="Total Jobs" icon={Calendar} />
        <StatCard value={stats.total_gaps || 0} label="Available Gaps" icon={Target} color="#00f0ff" />
        <StatCard value={stats.strong_gaps || 0} label="Strong Slots" icon={CheckCircle} color="#d4f64d" />
        <StatCard value={stats.tight_gaps || 0} label="Tight Slots" icon={AlertTriangle} color="#fbbf24" />
      </div>

      {/* Timeline Section */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">SCHEDULE TIMELINE</h3>
          </div>
          <div className="flex gap-2">
            {dates.slice(0, 7).map(date => (
              <button
                key={date}
                className={`px-3 py-1 text-xs rounded ${
                  selectedDate === date 
                    ? 'bg-[#d4f64d] text-black' 
                    : 'bg-[#27272a] text-[#a1a1aa] hover:text-white'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                {new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {selectedDate && (
            <Timeline 
              schedule={schedule} 
              gaps={gaps} 
              date={selectedDate}
            />
          )}
          
          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#27272a]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ff453a]/30 border border-[#ff453a]/50" />
              <span className="text-xs text-[#a1a1aa]">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#d4f64d]/20 border border-[#d4f64d]/40" />
              <span className="text-xs text-[#a1a1aa]">Strong Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#fbbf24]/20 border border-[#fbbf24]/40" />
              <span className="text-xs text-[#a1a1aa]">Tight Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#a1a1aa]/20 border border-[#a1a1aa]/40" />
              <span className="text-xs text-[#a1a1aa]">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded bg-[#00f0ff]" />
              <span className="text-xs text-[#a1a1aa]">Current Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs by Day Chart */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <TrendingUp size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">JOBS BY DAY</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-end gap-4 h-32">
            {Object.entries(stats.jobs_by_day || {}).map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-[#d4f64d]/20 rounded-t border border-[#d4f64d]/30"
                  style={{ height: `${(count / 5) * 100}%`, minHeight: count > 0 ? '20px' : '4px' }}
                >
                  <div className="w-full h-full bg-gradient-to-t from-[#d4f64d]/40 to-transparent" />
                </div>
                <span className="text-xs text-[#a1a1aa]">{day.slice(0, 3)}</span>
                <span className="text-sm font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== GAP FINDER VIEW ==============
const GapFinderView = ({ gaps, loading, onRefresh }) => {
  const [filterType, setFilterType] = useState("all");
  
  const filteredGaps = gaps.filter(g => {
    if (filterType === "all") return true;
    return g.gap_type === filterType.toUpperCase();
  });

  const strongCount = gaps.filter(g => g.gap_type === "STRONG").length;
  const tightCount = gaps.filter(g => g.gap_type === "TIGHT").length;

  return (
    <div className="space-y-6 animate-slide-in" data-testid="gap-finder-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GAP FINDER</h2>
          <p className="text-sm text-[#a1a1aa]">Layer 1 - Identify Available Slot Windows</p>
        </div>
        <button 
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          data-testid="refresh-gaps-btn"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Recalculate
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card cursor-pointer" onClick={() => setFilterType("all")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-[#00f0ff]">{gaps.length}</div>
              <div className="stat-label">Total Gaps Found</div>
            </div>
            <Target size={24} className="text-[#00f0ff]" />
          </div>
        </div>
        <div className="stat-card cursor-pointer" onClick={() => setFilterType("strong")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-[#d4f64d]">{strongCount}</div>
              <div className="stat-label">Strong Opportunities</div>
            </div>
            <CheckCircle size={24} className="text-[#d4f64d]" />
          </div>
        </div>
        <div className="stat-card cursor-pointer" onClick={() => setFilterType("tight")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-[#fbbf24]">{tightCount}</div>
              <div className="stat-label">Tight Windows</div>
            </div>
            <AlertTriangle size={24} className="text-[#fbbf24]" />
          </div>
        </div>
      </div>

      {/* Gaps Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold">AVAILABLE GAPS</h3>
          <div className="flex gap-2">
            {["all", "strong", "tight"].map(type => (
              <button
                key={type}
                className={`px-3 py-1 text-xs rounded uppercase ${
                  filterType === type 
                    ? 'bg-[#d4f64d] text-black' 
                    : 'bg-[#27272a] text-[#a1a1aa]'
                }`}
                onClick={() => setFilterType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="gaps-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Window</th>
                <th>Duration</th>
                <th>From → To</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {filteredGaps.map((gap, idx) => (
                <tr key={idx}>
                  <td className="font-mono">{gap.date}</td>
                  <td>{gap.day_name}</td>
                  <td className="font-mono">{gap.gap_start} - {gap.gap_end}</td>
                  <td>
                    <span className={`badge ${
                      gap.gap_mins >= 180 ? 'badge-success' : 
                      gap.gap_mins >= 120 ? 'badge-warning' : 'badge-error'
                    }`}>
                      {gap.gap_mins} min
                    </span>
                  </td>
                  <td className="font-mono text-xs">
                    {gap.from_postcode || '—'} → {gap.to_postcode || '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      gap.gap_type === 'STRONG' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {gap.classification}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredGaps.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-[#a1a1aa] py-8">
                    No gaps found matching filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============== VIABILITY CHECK VIEW ==============
const ViabilityCheckView = ({ gaps, hasApiKey }) => {
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleCheck = async () => {
    if (!postcode.trim()) {
      toast.error("Please enter a lead postcode");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/viability-check-bulk`, null, {
        params: { lead_postcode: postcode, surveyor_id: "josh-001" }
      });
      setResults(response.data);
      toast.success(`Checked ${response.data.length} gaps`);
    } catch (error) {
      toast.error("Failed to check viability");
      console.error(error);
    }
    setLoading(false);
  };

  const viableCount = results.filter(r => r.viable).length;

  return (
    <div className="space-y-6 animate-slide-in" data-testid="viability-check-view">
      <div>
        <h2 className="text-2xl font-bold">VIABILITY CHECK</h2>
        <p className="text-sm text-[#a1a1aa]">Layer 2 - Validate Slots Against Drive Times</p>
      </div>

      {/* Input Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">LEAD POSTCODE</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                className="form-input"
                placeholder="Enter UK postcode (e.g., B15 2TT)"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                data-testid="postcode-input"
              />
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleCheck}
              disabled={loading || !postcode.trim()}
              data-testid="check-viability-btn"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Check Viability
            </button>
          </div>
          
          {!hasApiKey && (
            <div className="mt-4 p-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-lg flex items-center gap-3">
              <AlertTriangle size={18} className="text-[#fbbf24]" />
              <p className="text-sm text-[#fbbf24]">
                NextBillion API key not configured. Using estimated drive times.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={results.length} label="Slots Checked" icon={Target} color="#00f0ff" />
            <StatCard value={viableCount} label="Viable Slots" icon={CheckCircle} color="#d4f64d" />
            <StatCard value={results.length - viableCount} label="Rejected" icon={XCircle} color="#ff453a" />
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">VIABILITY RESULTS FOR {postcode}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" data-testid="viability-results-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Window</th>
                    <th>Available</th>
                    <th>Required</th>
                    <th>Drive From</th>
                    <th>Drive To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx}>
                      <td className="font-mono">{result.gap?.date}</td>
                      <td className="font-mono">
                        {result.gap?.gap_start} - {result.gap?.gap_end}
                      </td>
                      <td className="font-mono">{result.available_gap_mins} min</td>
                      <td className="font-mono">{result.required_window_mins} min</td>
                      <td className="font-mono">{result.drive_time_from || '—'} min</td>
                      <td className="font-mono">{result.drive_time_to || '—'} min</td>
                      <td>
                        {result.viable ? (
                          <span className="badge badge-success">
                            {result.uses_long_drive ? 'VIABLE (Long Drive)' : 'VIABLE'}
                          </span>
                        ) : (
                          <span className="badge badge-error">REJECT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============== PREFERENCE FILTER VIEW ==============
const PreferenceFilterView = ({ gaps }) => {
  const [preferences, setPreferences] = useState({
    preferred_day: "",
    time_of_day: "",
    specific_date: ""
  });
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState([]);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/preference-filter`, preferences, {
        params: { surveyor_id: "josh-001" }
      });
      setOffers(response.data);
      toast.success(`Found ${response.data.length} slots`);
    } catch (error) {
      toast.error("Failed to filter preferences");
      console.error(error);
    }
    setLoading(false);
  };

  const matchCount = offers.filter(o => o.preference_match).length;

  return (
    <div className="space-y-6 animate-slide-in" data-testid="preference-filter-view">
      <div>
        <h2 className="text-2xl font-bold">PREFERENCE FILTER</h2>
        <p className="text-sm text-[#a1a1aa]">Layer 3 - Match Slots to Customer Preferences</p>
      </div>

      {/* Preferences Input */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">CUSTOMER PREFERENCES</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Preferred Day</label>
              <select 
                className="form-input"
                value={preferences.preferred_day}
                onChange={(e) => setPreferences({...preferences, preferred_day: e.target.value})}
                data-testid="preferred-day-select"
              >
                <option value="">Any Day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Time of Day</label>
              <select 
                className="form-input"
                value={preferences.time_of_day}
                onChange={(e) => setPreferences({...preferences, time_of_day: e.target.value})}
                data-testid="time-of-day-select"
              >
                <option value="">Any Time</option>
                <option value="morning">Morning (before 12pm)</option>
                <option value="afternoon">Afternoon (12pm - 5pm)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Specific Date</label>
              <input
                type="date"
                className="form-input"
                value={preferences.specific_date}
                onChange={(e) => setPreferences({...preferences, specific_date: e.target.value})}
                data-testid="specific-date-input"
              />
            </div>
          </div>
          <button 
            className="btn btn-primary mt-4"
            onClick={handleFilter}
            disabled={loading}
            data-testid="filter-preferences-btn"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
            Filter & Rank Slots
          </button>
        </div>
      </div>

      {/* Results */}
      {offers.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard value={matchCount} label="Preference Matches" icon={CheckCircle} color="#d4f64d" />
            <StatCard value={offers.length - matchCount} label="Alternative Slots" icon={ChevronRight} color="#a1a1aa" />
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">RANKED SLOT OFFERS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" data-testid="preference-results-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Slot Time</th>
                    <th>Match</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.slice(0, 10).map((offer, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`font-mono font-bold ${offer.rank <= 3 ? 'text-[#d4f64d]' : ''}`}>
                          #{offer.rank}
                        </span>
                      </td>
                      <td className="font-mono">{offer.date}</td>
                      <td>{offer.day_name}</td>
                      <td className="font-mono">{offer.slot_start} - {offer.slot_end}</td>
                      <td>
                        {offer.preference_match ? (
                          <span className="badge badge-success">MATCH</span>
                        ) : (
                          <span className="badge badge-info">ALTERNATIVE</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-secondary text-xs py-1 px-3">
                          Offer to Lead
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============== CONFIGURATION VIEW ==============
const ConfigurationView = ({ config, onSave, hasApiKey, onSaveApiKey }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(localConfig);
    setSaving(false);
    toast.success("Configuration saved");
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    await onSaveApiKey(apiKey);
    setApiKey("");
    toast.success("API key saved");
  };

  const updateConfig = (key, value) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-slide-in" data-testid="configuration-view">
      <div>
        <h2 className="text-2xl font-bold">CONFIGURATION</h2>
        <p className="text-sm text-[#a1a1aa]">Master Settings for the Slot Engine</p>
      </div>

      {/* API Key Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <Key size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">NEXTBILLION API KEY</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="password"
                className="form-input"
                placeholder={hasApiKey ? "••••••••••••••••" : "Enter your NextBillion API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="api-key-input"
              />
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleSaveApiKey}
              data-testid="save-api-key-btn"
            >
              <Key size={16} />
              {hasApiKey ? "Update Key" : "Save Key"}
            </button>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-2">
            {hasApiKey 
              ? "✓ API key configured - geocoding and drive times enabled" 
              : "No API key configured - using estimated drive times"}
          </p>
        </div>
      </div>

      {/* Franchise Operations */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">A — FRANCHISE OPERATIONS</h3>
        </div>
        <div className="card-body grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Survey Duration (mins)</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.survey_duration_mins || 90}
              onChange={(e) => updateConfig('survey_duration_mins', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Working Hours Start</label>
            <input 
              type="time" 
              className="form-input"
              value={localConfig.working_hours_start || "08:00"}
              onChange={(e) => updateConfig('working_hours_start', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Working Hours End</label>
            <input 
              type="time" 
              className="form-input"
              value={localConfig.working_hours_end || "18:00"}
              onChange={(e) => updateConfig('working_hours_end', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Booking Window (days)</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.booking_window_days || 14}
              onChange={(e) => updateConfig('booking_window_days', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Buffer Each Side (mins)</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.buffer_mins_each_side || 15}
              onChange={(e) => updateConfig('buffer_mins_each_side', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Long Drives/Day</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.max_long_drives_per_day || 1}
              onChange={(e) => updateConfig('max_long_drives_per_day', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Distance-Based Gaps */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">B — DISTANCE-BASED MINIMUM GAPS</h3>
        </div>
        <div className="card-body grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Long Drive Threshold (mins)</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.long_drive_threshold_mins || 45}
              onChange={(e) => updateConfig('long_drive_threshold_mins', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Drive Time Cap (mins)</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.max_drive_time_hard_cap_mins || 75}
              onChange={(e) => updateConfig('max_drive_time_hard_cap_mins', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Drive Time Safety Multiplier</label>
            <input 
              type="number" 
              step="0.05"
              className="form-input"
              value={localConfig.drive_time_safety_mult || 1.15}
              onChange={(e) => updateConfig('drive_time_safety_mult', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Territory Rules */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">C — TERRITORY RULES</h3>
        </div>
        <div className="card-body grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Dense Day Threshold</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.dense_day_threshold || 4}
              onChange={(e) => updateConfig('dense_day_threshold', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sparse Day Threshold</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.sparse_day_threshold || 2}
              onChange={(e) => updateConfig('sparse_day_threshold', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Dense Day Min Gap (mins)</label>
            <input 
              type="number" 
              className="form-input"
              value={localConfig.dense_day_min_gap_mins || 150}
              onChange={(e) => updateConfig('dense_day_min_gap_mins', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-16">
        <button 
          className="btn btn-primary relative z-50"
          onClick={handleSave}
          disabled={saving}
          data-testid="save-config-btn"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
          Save Configuration
        </button>
      </div>
    </div>
  );
};

// ============== MAIN APP ==============
function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [config, setConfig] = useState({});
  const [hasApiKey, setHasApiKey] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [statsRes, scheduleRes, configRes, apiKeyRes] = await Promise.all([
        axios.get(`${API}/dashboard-stats`, { params: { surveyor_id: "josh-001" } }),
        axios.get(`${API}/schedule`, { params: { surveyor_id: "josh-001" } }),
        axios.get(`${API}/config`),
        axios.get(`${API}/api-key/status`)
      ]);
      
      setStats(statsRes.data);
      setSchedule(scheduleRes.data);
      setConfig(configRes.data);
      setHasApiKey(apiKeyRes.data.has_key);
      
      // Load gaps
      const gapsRes = await axios.get(`${API}/gaps`, { params: { surveyor_id: "josh-001" } });
      setGaps(gapsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
    setLoading(false);
  }, []);

  const seedData = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/seed-data`);
      toast.success("Data seeded successfully");
      await loadData();
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Failed to seed data");
    }
    setLoading(false);
  };

  const saveConfig = async (newConfig) => {
    try {
      await axios.put(`${API}/config`, newConfig);
      setConfig(newConfig);
    } catch (error) {
      toast.error("Failed to save configuration");
    }
  };

  const saveApiKey = async (key) => {
    try {
      await axios.post(`${API}/api-key`, { nextbillion_key: key });
      setHasApiKey(true);
    } catch (error) {
      toast.error("Failed to save API key");
    }
  };

  const refreshGaps = async () => {
    setLoading(true);
    try {
      const gapsRes = await axios.get(`${API}/gaps`, { params: { surveyor_id: "josh-001" } });
      setGaps(gapsRes.data);
      toast.success("Gaps recalculated");
    } catch (error) {
      toast.error("Failed to refresh gaps");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if data is seeded
  useEffect(() => {
    if (!loading && schedule.length === 0) {
      seedData();
    }
  }, [loading, schedule.length]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView 
            stats={stats} 
            schedule={schedule} 
            gaps={gaps}
            onRefresh={loadData}
            loading={loading}
          />
        );
      case "gaps":
        return (
          <GapFinderView 
            gaps={gaps}
            loading={loading}
            onRefresh={refreshGaps}
          />
        );
      case "viability":
        return (
          <ViabilityCheckView 
            gaps={gaps}
            hasApiKey={hasApiKey}
          />
        );
      case "preferences":
        return (
          <PreferenceFilterView 
            gaps={gaps}
          />
        );
      case "config":
        return (
          <ConfigurationView 
            config={config}
            onSave={saveConfig}
            hasApiKey={hasApiKey}
            onSaveApiKey={saveApiKey}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="App" data-testid="app-container">
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
        }}
      />
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <header className="sticky top-0 z-40 w-full glass border-b border-[#27272a] h-16 flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold uppercase tracking-tight">
              {activeTab === "dashboard" && "Schedule Dashboard"}
              {activeTab === "gaps" && "Gap Finder"}
              {activeTab === "viability" && "Viability Check"}
              {activeTab === "preferences" && "Preference Filter"}
              {activeTab === "config" && "Configuration"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-2 text-sm ${hasApiKey ? 'text-[#d4f64d]' : 'text-[#a1a1aa]'}`}>
              {hasApiKey ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {hasApiKey ? 'API Connected' : 'No API Key'}
            </span>
          </div>
        </header>
        
        <div className="p-6">
          {loading && schedule.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-[#d4f64d]" />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
