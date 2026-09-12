// frontend/src/pages/officer/LiveMap.jsx
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  MapPin, Train, AlertTriangle, Shield, CheckCircle2,
  Clock, Route, RefreshCw, X, Search, Calendar,
  Wrench, Users, AlertCircle, CheckCheck
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Button from "../../components/common/Button";
import AgentDecisionTrace from "../../components/common/AgentDecisionTrace";
import PlanExplanation from "../../components/officer/PlanExplanation";
import { checkConflict, fetchAgentPlan, fetchRequests, fetchTracks, updateRequestStatus } from "../../utils/api";


// ============================================================
// BASE URL
// ============================================================
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ============================================================
// MAP CONTROLLER — auto-zoom to selected track
// ============================================================
function detourDistanceKm(alternative) {
  if (alternative?.routeGeometry?.extraDistanceKm != null) {
    return Number(alternative.routeGeometry.extraDistanceKm);
  }
  const text = `${alternative?.trainImpact || ""} ${alternative?.description || ""}`;
  return Number(text.match(/\+?(\d+(?:\.\d+)?)\s*km/i)?.[1] || 0);
}

function buildDetourRoute(track, alternative) {
  const supplied = alternative?.routeGeometry?.coordinates || alternative?.geometry?.coordinates;
  if (!track || !Array.isArray(supplied) || supplied.length < 2) return null;
  return {
    coordinates: supplied,
    extraKm: detourDistanceKm(alternative),
    source: alternative.routeGeometry?.source || "PLANNER_NETWORK",
    trackIds: alternative.routeGeometry?.trackIds || alternative.routeTrackIds || [],
  };
}

function MapController({ selectedTrack, detourRoute }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedTrack) return;
    const coords = selectedTrack.geometry?.coordinates;
    if (!coords || coords.length === 0) return;

    const allCoordinates = detourRoute?.coordinates?.length ? [...coords, ...detourRoute.coordinates] : coords;
    const latLngs = allCoordinates.map((c) => [c[1], c[0]]);
    map.fitBounds(latLngs, { padding: [60, 60], maxZoom: 14 });
  }, [selectedTrack, detourRoute, map]);

  return null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function LiveMap() {
  const location = useLocation();
  const initialRouteIntent = useMemo(() => {
    if (location.state?.trackId) return location.state;
    const params = new URLSearchParams(location.search);
    if (params.get("preview") !== "reroute" || !params.get("track")) return null;
    return {
      trackId: params.get("track"),
      requestId: params.get("request"),
      detourAlternative: {
        type: "REROUTE",
        trainImpact: `Detour +${params.get("extraKm") || 14} km`,
        delayMinutes: Number(params.get("delay") || 20),
      },
    };
  }, [location.search, location.state]);
  const [tracks, setTracks] = useState(null);           // GeoJSON FeatureCollection
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [corridorInfo, setCorridorInfo] = useState(null);
  const [selectedDay, setSelectedDay] = useState("ALL");
  const [conflictData, setConflictData] = useState(null);
  const [agentPlan, setAgentPlan] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("trains");
  const [searchId, setSearchId] = useState("");
  const [searchError, setSearchError] = useState("");
  const [activeDetour, setActiveDetour] = useState(initialRouteIntent?.detourAlternative || null);
  const [detourHidden, setDetourHidden] = useState(false);

  // Live maintenance requests and completion override state
  const [requests, setRequests] = useState([]);
  const [completedMap, setCompletedMap] = useState({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [detourCaseId] = useState(initialRouteIntent?.requestId || null);
  const [detourRequested] = useState(Boolean(initialRouteIntent?.detourAlternative));

  const geoJsonRef = useRef(null);
  const routeIntentRef = useRef(initialRouteIntent);
  const routeIntentHandledRef = useRef(false);

  // ----------------------------------------------------------
  // HELPER: DETECT TRACK MAINTENANCE STATE (RED vs BLUE vs NORMAL)
  // ----------------------------------------------------------
  const getTrackState = (trackId, requestsList, manualCompleted) => {
    if (!requestsList || requestsList.length === 0 || !trackId) return null;

    const match = requestsList.find((r) => {
      const isApproved =
        r.status === "Approved" ||
        r.status === "APPROVED" ||
        r.status === "Completed" ||
        r.status === "COMPLETED" ||
        r.raw?.status === "APPROVED" ||
        r.raw?.status === "COMPLETED" ||
        r.raw?.status === "SCHEDULED" ||
        r.raw?.status === "IN_PROGRESS";

      if (!isApproved) return false;

      const tId = r.raw?.track_id || r.track_id || r.recommendedBlock?.trackId;
      const tIds = r.raw?.track_ids || r.track_ids || (tId ? [tId] : []);
      return tIds.includes(trackId) || tId === trackId;
    });

    if (!match) return null;

    const reqId = match.id;
    const isExplicitCompleted =
      match.status === "Completed" ||
      match.status === "COMPLETED" ||
      match.raw?.status === "COMPLETED";

    const isManuallyFinished = Boolean(manualCompleted && manualCompleted[reqId]);

    // Check if allocated time window has expired on scheduled date
    let isTimeFinished = false;
    try {
      const endTimeStr =
        match.recommendedBlock?.endTime || match.raw?.preferred_end_time || match.raw?.scheduled_end_time;
      const reqDateStr =
        match.date || match.raw?.requested_date || match.raw?.from_date || new Date().toISOString().split("T")[0];

      if (endTimeStr && reqDateStr) {
        const [endH, endM] = endTimeStr.split(":").map(Number);
        const endDateTime = new Date(`${reqDateStr}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`);
        const now = new Date();
        if (now > endDateTime) {
          isTimeFinished = true;
        }
      }
    } catch {
      isTimeFinished = false;
    }

    const isFinished = isExplicitCompleted || isManuallyFinished || isTimeFinished;

    return {
      request: match,
      isFinished,
      color: isFinished ? "#2563eb" : "#dc2626", // BLUE when finished, RED when active!
      statusText: isFinished ? "Completed maintenance" : "Approved maintenance",
      team: match.department || match.raw?.department || "Engineering Team",
      maintenanceType: match.type || match.raw?.task_type || "Track Maintenance",
      allocatedDate: match.date || match.raw?.requested_date || match.recommendedBlock?.date || "2026-09-10",
      allocatedTime: `${match.recommendedBlock?.startTime || match.raw?.preferred_start_time || "19:00"} - ${match.recommendedBlock?.endTime || match.raw?.preferred_end_time || "21:00"}`,
      duration: match.raw?.estimated_duration_minutes || match.raw?.durationMinutes || 120,
      description: match.reason || match.raw?.description || "Track possession work",
      requestId: match.id,
    };
  };

  // ----------------------------------------------------------
  // STYLE FOR EACH TRACK SEGMENT (RED / BLUE / SLATE)
  // ----------------------------------------------------------
  const getStyleForFeature = (feature, isSelected = false, isHovered = false) => {
    const trackId = feature.properties?.track_id;
    const maint = getTrackState(trackId, requests, completedMap);

    if (maint) {
      if (!maint.isFinished) {
        // RED TRACK: Active Approved Maintenance
        return {
          color: "#dc2626",
          weight: isSelected ? 8 : (isHovered ? 7 : 5),
          opacity: 1,
        };
      } else {
        // BLUE TRACK: Maintenance Finished
        return {
          color: "#2563eb",
          weight: isSelected ? 8 : (isHovered ? 6 : 4.5),
          opacity: 0.95,
        };
      }
    }

    // Normal track
    if (isSelected) {
      return {
        color: "#f59e0b", // Amber highlight for selected normal track
        weight: 7,
        opacity: 1,
      };
    }

    return {
      color: isHovered ? "#94a3b8" : "#64748b",
      weight: isHovered ? 4 : 2.5,
      opacity: isHovered ? 0.9 : 0.6,
    };
  };

  const trackStyle = (feature) => {
    const isSelected =
      selectedTrack &&
      feature.properties?.track_id === selectedTrack.properties?.track_id;
    return getStyleForFeature(feature, isSelected, false);
  };

  // ----------------------------------------------------------
  // LOAD REAL OSM GEOJSON + LIVE REQUESTS
  // ----------------------------------------------------------
  useEffect(() => {
    fetchTracks()
      .then((data) => {
        setTracks(data);
        console.log(`Loaded ${data.features?.length} real OSM track segments`);
      })
      .catch((err) => {
        console.error("Error loading tracks:", err);
      });

    // Load active and approved maintenance requests
    const loadReqs = () => {
      fetchRequests()
        .then((data) => {
          if (Array.isArray(data)) {
            setRequests(data);
          }
        })
        .catch((err) => console.warn("Could not load requests for map:", err));
    };

    loadReqs();
    const interval = setInterval(() => {
      loadReqs();
      setCurrentTime(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Restyle layers whenever requests, completedMap, selectedTrack, or currentTime changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (layer.feature) {
          const isSel = selectedTrack?.properties?.track_id === layer.feature.properties?.track_id;
          layer.setStyle(getStyleForFeature(layer.feature, isSel, false));
        }
      });
    }
    // The style helper is intentionally re-created from exactly these live inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, completedMap, selectedTrack, currentTime]);

  // ----------------------------------------------------------
  // LOAD SCHEDULE + CONFLICT + AI for a selected track
  // ----------------------------------------------------------
  const loadTrackDetails = async (feature, day = selectedDay, options = {}) => {
    const trackId = feature.properties.track_id;
    setSelectedTrack(feature);
    setActiveDetour(options.detour || null);
    setDetourHidden(false);
    setLoadingDetails(true);
    setSchedules([]);
    setConflictData(null);
    setAgentPlan(null);

    // If this track is under maintenance, default to "maintenance" tab
    const maint = getTrackState(trackId, requests, completedMap);
    setActiveTab(options.detour ? "ai" : (maint ? "maintenance" : "trains"));

    try {
      // 1. Corridor-Aware Real schedule
      const schedUrl = day && day !== "ALL"
        ? `${BASE_URL}/tracks/${trackId}/schedule?day=${day}`
        : `${BASE_URL}/tracks/${trackId}/schedule`;
      const schedRes = await fetch(schedUrl);
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        setSchedules(schedData.schedules || []);
        if (schedData.corridor) setCorridorInfo(schedData.corridor);
      }

      // 2. Conflict check
      const conflict = await checkConflict({
        trackId,
        date: "2026-09-15",
        startTime: "19:00",
        endTime: "20:30",
      });
      setConflictData(conflict);

      // 3. AI plan
      const plan = await fetchAgentPlan({
        trackId,
        planningDate: "2026-09-15",
        startTime: "19:00",
        endTime: "20:30",
        durationMinutes: 90,
      });
      setAgentPlan(plan);
    } catch (err) {
      console.error("Error loading track details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    const intent = routeIntentRef.current;
    if (!tracks || !intent?.trackId || routeIntentHandledRef.current) return;
    const requestedFeature = tracks.features?.find(
      (feature) => feature.properties?.track_id?.toUpperCase() === intent.trackId.toUpperCase()
    );
    if (!requestedFeature) return;
    routeIntentHandledRef.current = true;
    setSearchId(intent.trackId);
    loadTrackDetails(requestedFeature, selectedDay, { detour: intent.detourAlternative });
    // Route intent is consumed once after the GeoJSON network loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const handleDayChange = async (day) => {
    setSelectedDay(day);
    if (!selectedTrack) return;
    const trackId = selectedTrack.properties?.track_id;
    if (!trackId) return;

    try {
      const schedUrl = day && day !== "ALL"
        ? `${BASE_URL}/tracks/${trackId}/schedule?day=${day}`
        : `${BASE_URL}/tracks/${trackId}/schedule`;
      const schedRes = await fetch(schedUrl);
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        setSchedules(schedData.schedules || []);
        if (schedData.corridor) setCorridorInfo(schedData.corridor);
      }
    } catch (e) {
      console.warn("Could not filter schedule by day:", e);
    }
  };

  // ----------------------------------------------------------
  // TOGGLE MAINTENANCE COMPLETED (TURNS RED -> BLUE)
  // ----------------------------------------------------------
  const handleToggleMaintenanceFinished = async (reqId) => {
    const isNowFinished = !completedMap[reqId];
    setCompletedMap((prev) => ({
      ...prev,
      [reqId]: isNowFinished,
    }));

    try {
      if (isNowFinished) {
        await updateRequestStatus(reqId, "Completed", "COMPLETED", "Officer marked possession finished on live map.");
      } else {
        await updateRequestStatus(reqId, "Approved", "APPROVED", "Officer re-opened possession on live map.");
      }
      const updated = await fetchRequests();
      if (Array.isArray(updated)) setRequests(updated);
    } catch (e) {
      console.warn("Status update error:", e);
    }
  };

  // ----------------------------------------------------------
  // HOVER / CLICK HANDLERS FOR EACH SEGMENT
  // ----------------------------------------------------------
  const onEachTrack = (feature, layer) => {
    const trackId = feature.properties.track_id;
    const maint = getTrackState(trackId, requests, completedMap);

    // Rich Tooltip on hover showing Maintenance Info or Inspection Prompt
    let tooltipHtml = `<strong>${trackId}</strong>`;
    if (maint) {
      if (maint.isFinished) {
        tooltipHtml += `<br/><span style="color:#2563eb;font-weight:bold;">Completed maintenance</span><br/><small style="color:#475569;">${maint.team} • ${maint.maintenanceType}</small>`;
      } else {
        tooltipHtml += `<br/><span style="color:#dc2626;font-weight:bold;">Approved maintenance</span><br/><small style="color:#475569;">${maint.team} • ${maint.maintenanceType}</small><br/><small style="color:#64748b;">${maint.allocatedTime}</small>`;
      }
    } else {
      tooltipHtml += `<br/><small style="color:#64748b;">Click to inspect schedules</small>`;
    }

    layer.bindTooltip(tooltipHtml, { sticky: true, className: "track-tooltip" });

    layer.on({
      click: () => {
        loadTrackDetails(feature);
      },
      mouseover: (e) => {
        const isSelected = selectedTrack?.properties?.track_id === trackId;
        e.target.setStyle(getStyleForFeature(feature, isSelected, true));
      },
      mouseout: (e) => {
        const isSelected = selectedTrack?.properties?.track_id === trackId;
        e.target.setStyle(getStyleForFeature(feature, isSelected, false));
      },
    });
  };

  // ----------------------------------------------------------
  // SEARCH BY TRACK ID
  // ----------------------------------------------------------
  const handleSearch = () => {
    if (!tracks) return;
    const id = searchId.trim().toUpperCase();
    if (!id) return;

    const feature = tracks.features.find(
      (f) => f.properties.track_id?.toUpperCase() === id
    );

    if (!feature) {
      setSearchError(`Track "${id}" not found`);
      return;
    }

    setSearchError("");
    loadTrackDetails(feature);
  };

  const validAgentAlternatives = useMemo(
    () => (agentPlan?.alternatives || []).filter(
      (alternative) => alternative.type !== "REROUTE" || alternative.routeGeometry?.coordinates?.length > 1
    ),
    [agentPlan]
  );
  const agentReroute = validAgentAlternatives.find((alternative) => alternative.type === "REROUTE") || null;
  const displayedDetour = detourHidden ? null : (
    activeDetour?.routeGeometry?.coordinates?.length > 1
      ? activeDetour
      : (detourRequested ? agentReroute : activeDetour)
  );
  const detourRoute = useMemo(
    () => displayedDetour?.type === "REROUTE" ? buildDetourRoute(selectedTrack, displayedDetour) : null,
    [selectedTrack, displayedDetour]
  );

  const selectedMaint = selectedTrack
    ? getTrackState(selectedTrack.properties?.track_id, requests, completedMap)
    : null;

  // Counts & list for the legend and quick jump
  let activeMaintCount = 0;
  let finishedMaintCount = 0;
  const activeMaintTracks = [];

  requests.forEach((r) => {
    const isApproved = r.status === "Approved" || r.status === "APPROVED";
    const isDone = r.status === "Completed" || completedMap[r.id];
    const tId = r.raw?.track_id || r.track_id || r.recommendedBlock?.trackId;

    if (isApproved && !isDone) {
      activeMaintCount++;
      if (tId && !activeMaintTracks.some((x) => x.trackId === tId)) {
        activeMaintTracks.push({
          trackId: tId,
          team: r.department || r.raw?.department || "Team",
          maintenanceType: r.type || r.raw?.task_type || "Maintenance",
          isFinished: false,
          reqId: r.id,
        });
      }
    } else if (isDone) {
      finishedMaintCount++;
      if (tId && !activeMaintTracks.some((x) => x.trackId === tId)) {
        activeMaintTracks.push({
          trackId: tId,
          team: r.department || r.raw?.department || "Team",
          maintenanceType: r.type || r.raw?.task_type || "Maintenance",
          isFinished: true,
          reqId: r.id,
        });
      }
    }
  });

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 pb-20 md:p-4 md:pb-4">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="text-[#b83825]" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">
                  India Railway Live Map
                </h2>
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-[#b83825]">
                  REAL OSM DATA
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {tracks
                  ? `${tracks.features.length.toLocaleString()} track segments loaded — Red indicates approved maintenance; blue indicates completed maintenance`
                  : "Loading India railway network…"}
              </p>
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  aria-label="Search by track ID"
                  placeholder="Track ID (e.g. KA-T-000342)"
                  value={searchId}
                  onChange={(e) => { setSearchId(e.target.value); setSearchError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-56 rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#cf432c]"
                />
                {searchError && (
                  <p className="absolute top-full mt-1 text-xs text-red-600 whitespace-nowrap">{searchError}</p>
                )}
              </div>
              <Button
                onClick={handleSearch}
                icon={Search}
                className="px-3 py-2 text-sm shadow-sm"
              >
                Search
              </Button>
            </div>
          </div>

          {/* ── Legend ── */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="flex items-center gap-2 text-xs text-red-900 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 shadow-sm font-semibold">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse inline-block shadow-sm" />
              Approved maintenance ({activeMaintCount})
            </span>
            <span className="flex items-center gap-2 text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 shadow-sm font-semibold">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm" />
              Completed maintenance ({finishedMaintCount})
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="w-4 h-1 rounded bg-slate-500 inline-block" />
              Normal Railway Track
            </span>
            <span className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="w-4 h-1 rounded bg-amber-500 inline-block" />
              Selected Track
            </span>
            {detourRoute && (
              <span className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm">
                <span className="inline-block w-4 border-t-2 border-dashed border-violet-600" />
                Suggested detour (+{detourRoute.extraKm} km)
              </span>
            )}
            {!tracks && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                Loading real OSM geometry…
              </span>
            )}
          </div>

          {/* Quick-Jump to Maintenance Tracks */}
          {activeMaintTracks.length > 0 && (
            <div className="flex items-center gap-2 mb-3 overflow-x-auto py-1">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider shrink-0">
                Jump to Possession:
              </span>
              {activeMaintTracks.map((item) => (
                <button
                  key={item.trackId}
                  onClick={() => {
                    if (!tracks) return;
                    const feat = tracks.features?.find(
                      (f) => f.properties?.track_id?.toUpperCase() === item.trackId?.toUpperCase()
                    );
                    if (feat) {
                      loadTrackDetails(feat);
                    } else {
                      setSearchId(item.trackId);
                      handleSearch();
                    }
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-xs transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ${
                    item.isFinished
                      ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                      : "bg-red-50 border-red-200 text-red-800 hover:bg-red-100 font-bold"
                  }`}
                  title={`Click to zoom directly to ${item.trackId}`}
                >
                  <span className={`w-2 h-2 rounded-full ${item.isFinished ? "bg-blue-600" : "bg-red-600 animate-ping"}`} />
                  <span>{item.trackId}</span>
                  <span className="text-[10px] opacity-75 font-normal">({item.team})</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Main Area ── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[70vh]">

            {/* Map */}
            <div
              className={`${selectedTrack ? "lg:col-span-7" : "lg:col-span-12"} overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm`}
            >
              <MapContainer
                center={[15.3173, 75.7139]}
                zoom={7}
                minZoom={6}
                style={{ height: "100%", width: "100%", minHeight: "600px" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {tracks && (
                  <GeoJSON
                    ref={geoJsonRef}
                    key={tracks.features.length}
                    data={tracks}
                    style={trackStyle}
                    onEachFeature={onEachTrack}
                  />
                )}

                {detourRoute && (
                  <>
                    <Polyline
                      positions={detourRoute.coordinates.map((coordinate) => [coordinate[1], coordinate[0]])}
                      pathOptions={{ color: "#7c3aed", weight: 7, opacity: 0.9, dashArray: "12 9", lineCap: "round" }}
                    >
                      <Tooltip sticky>
                        Suggested reroute · +{detourRoute.extraKm} km · {displayedDetour?.delayMinutes || 20} min
                      </Tooltip>
                    </Polyline>
                    <CircleMarker center={[detourRoute.coordinates[0][1], detourRoute.coordinates[0][0]]} radius={6} pathOptions={{ color: "#5b21b6", fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}><Tooltip>Detour entry</Tooltip></CircleMarker>
                    <CircleMarker center={[detourRoute.coordinates.at(-1)[1], detourRoute.coordinates.at(-1)[0]]} radius={6} pathOptions={{ color: "#5b21b6", fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}><Tooltip>Detour exit</Tooltip></CircleMarker>
                  </>
                )}

                <MapController selectedTrack={selectedTrack} detourRoute={detourRoute} />
              </MapContainer>
            </div>

            {/* ── Right Panel: Track Inspector ── */}
            {selectedTrack && (
              <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_28px_rgb(0_0_0/0.08)] ring-1 ring-black/10 lg:col-span-5">

                {/* Panel Header */}
                <div className="flex items-start justify-between bg-[#171918] p-4 text-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <Train size={18} className="text-green-200" />
                      <h3 className="font-bold text-base">
                        {selectedTrack.properties.track_id}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-green-200">
                      OSM ID: {selectedTrack.properties.osm_id || selectedTrack.properties["@id"] || "—"}
                    </p>
                    {corridorInfo && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#cf432c] bg-[#171918]/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Route size={12} className="text-amber-300 shrink-0" />
                        <span>{corridorInfo.name}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedTrack(null); setSchedules([]); setCorridorInfo(null); }}
                    aria-label="Close track inspector"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-green-700 active:scale-[0.96]"
                  >
                    <X size={18} />
                  </button>
                </div>

                {detourRoute && (
                  <div className="border-b border-violet-200 bg-violet-50 p-3 text-violet-950">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <Route size={18} className="mt-0.5 shrink-0 text-violet-700" />
                        <div>
                          <p className="text-sm font-bold">Suggested reroute visible on map</p>
                          <p className="mt-0.5 text-xs leading-5 text-violet-800">
                            +{detourRoute.extraKm} km · about {displayedDetour?.delayMinutes || 20} min
                            {detourCaseId ? ` · Case ${detourCaseId}` : ""}
                          </p>
                          <p className="mt-1 text-[11px] leading-4 text-violet-700">
                            Follows connected railway edges in the loaded OSM network snapshot. Confirm signalling and current route availability before approval.
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setActiveDetour(null); setDetourHidden(true); }} className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">Hide</button>
                    </div>
                  </div>
                )}

                {detourRequested && agentPlan && !detourRoute && (
                  <div className="border-b border-amber-200 bg-amber-50 p-3 text-amber-950">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                      <div>
                        <p className="text-sm font-bold">No rail reroute available</p>
                        <p className="mt-0.5 text-xs leading-5 text-amber-800">The network search found no connected alternate track around {selectedTrack.properties.track_id}. No detour is drawn.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Maintenance Quick Banner if Track is Allocated */}
                {selectedMaint && (
                  <div
                    className={`p-3 border-b flex items-start justify-between gap-2 ${
                      selectedMaint.isFinished
                        ? "bg-blue-50 border-blue-200 text-blue-900"
                        : "bg-red-50 border-red-200 text-red-900"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {selectedMaint.isFinished ? (
                        <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0 animate-pulse" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">
                          {selectedMaint.isFinished ? "Completed maintenance" : "Approved maintenance"}
                        </p>
                        <p className="text-xs mt-0.5 font-medium">
                          Allocated to <strong>{selectedMaint.team}</strong> for <strong>{selectedMaint.maintenanceType}</strong>
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {selectedMaint.allocatedTime} ({selectedMaint.allocatedDate})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleMaintenanceFinished(selectedMaint.requestId)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded shadow-sm transition-colors shrink-0 ${
                        selectedMaint.isFinished
                          ? "bg-blue-700 text-white hover:bg-blue-800"
                          : "bg-red-700 text-white hover:bg-red-800"
                      }`}
                      title={selectedMaint.isFinished ? "Reopen maintenance" : "Mark completed"}
                    >
                      {selectedMaint.isFinished ? "Reopen maintenance" : "Mark completed"}
                    </button>
                  </div>
                )}

                {/* Track Properties */}
                <div className="grid grid-cols-4 gap-2 border-b border-green-100 bg-green-50 p-3 text-xs">
                  <div>
                    <p className="text-gray-500 font-medium">Max Speed</p>
                    <p className="font-bold text-gray-900">
                      {selectedTrack.properties.maxspeed || "—"} km/h
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Gauge</p>
                    <p className="font-bold text-gray-900">
                      {selectedTrack.properties.gauge || "—"} mm
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Electrified</p>
                    <p className="font-bold text-gray-900 capitalize">
                      {selectedTrack.properties.electrified === "contact_line"
                        ? "Yes (25kV)"
                        : selectedTrack.properties.electrified || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Usage</p>
                    <p className="font-bold text-gray-900 capitalize">
                      {selectedTrack.properties.usage || "—"}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
                  {[
                    ...(selectedMaint ? [
                      {
                        key: "maintenance",
                        label: "Maintenance",
                        icon: Wrench,
                        highlight: selectedMaint.isFinished ? "text-blue-700" : "text-red-600 font-bold",
                      }
                    ] : []),
                    { key: "trains", label: `Trains (${schedules.length})`, icon: Train },
                    { key: "conflicts", label: "Conflicts", icon: AlertTriangle },
                    { key: "ai", label: "AI Plan", icon: Shield },
                  ].map(({ key, label, icon: Icon, highlight }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 py-2.5 flex items-center justify-center gap-1 border-b-2 transition-colors ${
                        activeTab === key
                          ? "border-[#cf432c] bg-white text-[#b83825]"
                          : `border-transparent text-gray-500 hover:text-gray-700 ${highlight || ""}`
                      }`}
                    >
                      <Icon size={12} className={highlight ? highlight : ""} />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Panel Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                      <RefreshCw className="animate-spin text-green-700" size={28} />
                      <p className="text-xs">Fetching train schedules and analysis…</p>
                    </div>
                  ) : (
                    <>
                      {/* ── TAB: MAINTENANCE ALLOCATION INFO ── */}
                      {activeTab === "maintenance" && selectedMaint && (
                        <div className="space-y-3">
                          <div className={`rounded-lg border p-4 shadow-sm ${
                            selectedMaint.isFinished
                              ? "bg-blue-50/70 border-blue-200"
                              : "bg-red-50/70 border-red-200"
                          }`}>
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                                selectedMaint.isFinished
                                  ? "bg-blue-200 text-blue-900"
                                  : "bg-red-200 text-red-900"
                              }`}>
                                {selectedMaint.isFinished ? (
                                  <>Completed maintenance</>
                                ) : (
                                  <>Approved maintenance</>
                                )}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                #{selectedMaint.requestId}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
                              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-1">
                                  <Users size={12} className="text-green-700" /> Allocated Team
                                </span>
                                <p className="text-sm font-bold text-gray-900">
                                  {selectedMaint.team}
                                </p>
                              </div>

                              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-1">
                                  <Wrench size={12} className="text-amber-600" /> Maintenance Type
                                </span>
                                <p className="text-sm font-bold text-gray-900">
                                  {selectedMaint.maintenanceType}
                                </p>
                              </div>

                              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-1">
                                  <Clock size={12} className="text-purple-600" /> Allocated Time Window
                                </span>
                                <p className="text-sm font-bold text-gray-900">
                                  {selectedMaint.allocatedTime}
                                </p>
                                <span className="text-[10px] text-gray-500">
                                  Duration: {selectedMaint.duration} mins
                                </span>
                              </div>

                              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-1">
                                  <Calendar size={12} className="text-emerald-600" /> Scheduled Date
                                </span>
                                <p className="text-sm font-bold text-gray-900">
                                  {selectedMaint.allocatedDate}
                                </p>
                                <span className="text-[10px] text-gray-500">
                                  Track ID: {selectedTrack.properties?.track_id}
                                </span>
                              </div>
                            </div>

                            {selectedMaint.description && (
                              <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200 text-xs">
                                <p className="text-gray-500 font-medium mb-1">Work Description & Scope</p>
                                <p className="text-gray-800">{selectedMaint.description}</p>
                              </div>
                            )}

                            {/* Color Transition Control */}
                            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-xs font-bold text-gray-900">
                                  {selectedMaint.isFinished ? "Completed maintenance" : "Approved maintenance"}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {selectedMaint.isFinished
                                    ? "Maintenance is complete. The track is safe for train movements."
                                    : "Displays as completed when the scheduled window ends; it can also be marked completed manually."}
                                </p>
                              </div>
                              <button
                                onClick={() => handleToggleMaintenanceFinished(selectedMaint.requestId)}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ${
                                  selectedMaint.isFinished
                                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                                    : "bg-blue-700 hover:bg-blue-800 text-white"
                                }`}
                              >
                                {selectedMaint.isFinished ? (
                                  <>Reopen maintenance</>
                                ) : (
                                  <>
                                    <CheckCheck size={14} />
                                    Mark completed
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* ── TAB 1: TRAINS ── */}
                      {activeTab === "trains" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Trains Passing This Segment
                            </h4>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {schedules.length} {schedules.length === 1 ? "train" : "trains"} scheduled
                            </span>
                          </div>

                          {/* Interactive Day Filter */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-green-700" /> Filter by Day of Week:
                              </span>
                              {selectedDay !== "ALL" && (
                                <button
                                  onClick={() => handleDayChange("ALL")}
                                  className="text-[10px] font-semibold text-green-700 hover:underline"
                                >
                                  Reset to All
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                              {["ALL", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                                <button
                                  key={d}
                                  onClick={() => handleDayChange(d)}
                                  className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ${
                                    selectedDay === d
                                      ? "bg-[#171918] text-white shadow-xs"
                                      : "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200"
                                  }`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>

                          {corridorInfo?.description && (
                            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 leading-relaxed">
                              <strong className="text-blue-950 font-semibold">Corridor:</strong> {corridorInfo.description}
                            </div>
                          )}

                          {schedules.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                              <Train className="mx-auto mb-2 text-gray-300" size={32} />
                              <p className="text-xs text-gray-500 font-medium">No active train movements recorded for this block window</p>
                              <p className="text-xs text-gray-400 mt-1">Free for maintenance block authorization</p>
                            </div>
                          ) : (
                            schedules.map((sched) => (
                              <div
                                key={sched.trainNo}
                                className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:border-blue-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${
                                      sched.type === "VANDE BHARAT"
                                        ? "bg-purple-100 text-purple-800"
                                        : sched.type === "RAJDHANI" || sched.type === "SHATABDI"
                                        ? "bg-amber-100 text-amber-800"
                                        : sched.type === "GOODS"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}>
                                      {sched.type || "EXPRESS"}
                                    </span>
                                    <h5 className="font-bold text-gray-900 mt-1">
                                      🚆 {sched.trainName}
                                      <span className="text-gray-500 font-normal ml-1 text-xs">
                                        ({sched.trainNo})
                                      </span>
                                    </h5>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                      <Clock size={11} />
                                      {sched.arrival} → {sched.departure}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
                                  <span className="flex items-center gap-1">
                                    <Route size={11} />
                                    {sched.source} → {sched.destination}
                                  </span>
                                </div>

                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {(sched.operatingDays || []).map((d) => (
                                    <span
                                      key={d}
                                      className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* ── TAB 2: CONFLICTS ── */}
                      {activeTab === "conflicts" && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Conflict Detection (19:00–20:30 window)
                          </h4>

                          {conflictData && !conflictData.safe ? (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-red-800 font-bold mb-2 text-sm">
                                <AlertTriangle size={16} />
                                CONFLICT DETECTED
                              </div>
                              <p className="text-xs text-red-700 mb-3">
                                Maintenance window overlaps with active train movement on {selectedTrack.properties.track_id}.
                              </p>
                              {conflictData.conflicts?.map((c) => (
                                <div key={c.trainNo} className="bg-white rounded-lg p-2.5 border border-red-200 text-xs mb-2">
                                  <p className="font-bold text-gray-900">{c.trainName} ({c.trainNo})</p>
                                  <p className="text-gray-600">Occupancy: {c.arrival} → {c.departure}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                              <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                              <div>
                                <p className="font-bold text-[#8f2c1f] text-sm">Clear Maintenance Window</p>
                                <p className="text-xs text-green-700">No train conflicts in the 19:00–20:30 block.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── TAB 3: AI PLAN ── */}
                      {activeTab === "ai" && agentPlan && (
                        <div className="space-y-3">
                          <AgentDecisionTrace
                            compact
                            requestId={agentPlan.requestId || selectedTrack.properties.track_id}
                            trackIds={[selectedTrack.properties.track_id]}
                            requestedWindow={{ startTime: "19:00", endTime: "20:30" }}
                            agentPlan={{ ...agentPlan, alternatives: validAgentAlternatives }}
                            conflictData={conflictData}
                          />
                          <PlanExplanation
                            details={agentPlan.explanationDetails}
                            requestedWindow={{ startTime: "19:00", endTime: "20:30" }}
                            recommendedBlock={agentPlan.recommendedBlock}
                            conflicts={agentPlan.conflictingTrains || conflictData?.conflicts || []}
                          />
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-blue-700 font-semibold">MCDA Priority Score</p>
                                <p className="text-3xl font-extrabold text-blue-900">{agentPlan.priorityScore}/100</p>
                              </div>
                              <Shield size={32} className="text-blue-500 opacity-70" />
                            </div>
                            <p className="text-xs text-blue-800 mt-2 font-medium">{agentPlan.explanation}</p>
                          </div>

                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            AI Ranked Alternatives
                          </h4>

                          {validAgentAlternatives.map((alt) => (
                            <div
                              key={alt.id}
                              className={`border rounded-xl p-3.5 text-xs space-y-1 ${
                                alt.rank === 1
                                  ? "bg-green-50 border-green-300"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900">
                                  #{alt.rank}: {alt.type}
                                </span>
                                {alt.rank === 1 && (
                                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700">{alt.description}</p>
                              <p className="text-gray-500">Impact: {alt.trainImpact || "Zero delay"}</p>
                              {alt.type === "REROUTE" && alt.routeGeometry?.coordinates?.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (detourRoute) {
                                      setActiveDetour(null);
                                      setDetourHidden(true);
                                    } else {
                                      setActiveDetour(alt);
                                      setDetourHidden(false);
                                    }
                                  }}
                                  aria-pressed={Boolean(detourRoute)}
                                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-3 text-sm font-semibold text-violet-900 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
                                >
                                  <MapPin size={16} />
                                  {detourRoute ? "Hide detour on map" : "Show detour on map"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
