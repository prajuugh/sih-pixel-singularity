// frontend/src/pages/officer/LiveMap.jsx
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Tooltip,
  Marker,
  useMap,
} from "react-leaflet";
import {
  MapPin, Train, AlertTriangle, Package, Shield, CheckCircle2,
  Clock, Route, RefreshCw, X, Search, Calendar,
  Wrench, Users, AlertCircle, CheckCheck,
  Globe, Compass, Zap, Navigation, ArrowRight, Eye,
  Sliders, ChevronLeft, ChevronRight, ChevronDown, Layers, Activity, Filter,
  Check, HardHat, Target, FileEdit, FileText, Send, Copy, Plus, Hash, ArrowLeft
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Button from "../../components/common/Button";
import AgentDecisionTrace from "../../components/common/AgentDecisionTrace";
import PlanExplanation from "../../components/officer/PlanExplanation";
import { useAuth } from "../../hooks/useAuth";
import {
  checkConflict, fetchAgentPlan, fetchRequests, fetchTracks,
  updateRequestStatus, fetchTrainRoute, fetchTrainsList, fetchUpcomingTrains,
  submitRequest, buildRequestId
} from "../../utils/api";
import {
  departments, assetTypes, maintenanceTypes, assetConditions
} from "../../utils/constants";
import { evaluateDiversionPassivity } from "../../utils/trainTractionHelper";
import { getScheduledFreightForTrack } from "../../utils/scheduledFreightHelper";
import { isFreightTrain } from "../../utils/trafficClassification";

// ============================================================
// BASE URL & POPULAR TRUNK CORRIDORS
// ============================================================
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const IR_ZONES = [
  { code: "ALL", name: "All Railway Zones (Pan-India)" },
  { code: "SWR", name: "SWR - South Western Railway" },
  { code: "NR", name: "NR - Northern Railway" },
  { code: "WR", name: "WR - Western Railway" },
  { code: "CR", name: "CR - Central Railway" },
  { code: "SR", name: "SR - Southern Railway" },
  { code: "ER", name: "ER - Eastern Railway" },
  { code: "SCR", name: "SCR - South Central Railway" },
  { code: "NCR", name: "NCR - North Central Railway" },
  { code: "NWR", name: "NWR - North Western Railway" },
  { code: "ECR", name: "ECR - East Central Railway" },
  { code: "WCR", name: "WCR - West Central Railway" },
  { code: "ECOR", name: "ECoR - East Coast Railway" },
  { code: "SECR", name: "SECR - South East Central Railway" },
  { code: "SER", name: "SER - South Eastern Railway" },
  { code: "NFR", name: "NFR - Northeast Frontier Railway" },
  { code: "KR", name: "KR - Konkan Railway" },
];

const TRAIN_TYPES = [
  { id: "ALL", label: "All Trains (5,208)" },
  { id: "VANDE BHARAT", label: "⚡ Vande Bharat" },
  { id: "RAJDHANI", label: "👑 Rajdhani" },
  { id: "SHATABDI", label: "✨ Shatabdi" },
  { id: "SUPERFAST", label: "🚀 Superfast" },
  { id: "EXPRESS", label: "🚆 Express & Mail" },
  { id: "PASSENGER", label: "🎫 Passenger" },
  { id: "GOODS", label: "📦 Freight / Goods" },
];

const POPULAR_CORRIDOR_TRAINS = [
  { no: "12301", name: "Howrah Rajdhani", from: "HWH", to: "NDLS", type: "RAJDHANI" },
  { no: "12951", name: "Mumbai Rajdhani", from: "BCT", to: "NDLS", type: "RAJDHANI" },
  { no: "12627", name: "Karnataka Express", from: "SBC", to: "NDLS", type: "SUPERFAST" },
  { no: "22691", name: "Bengaluru Rajdhani", from: "SBC", to: "NZM", type: "RAJDHANI" },
  { no: "12007", name: "Chennai Shatabdi", from: "MAS", to: "MYS", type: "SHATABDI" },
  { no: "12423", name: "Dibrugarh Rajdhani", from: "DBRT", to: "NDLS", type: "RAJDHANI" },
  { no: "20671", name: "Vande Bharat Exp", from: "SBC", to: "KLBG", type: "VANDE BHARAT" },
  { no: "16589", name: "Rani Chennamma", from: "SBC", to: "MRJ", type: "SUPERFAST" },
];

// All 36 States & Union Territories of India
const INDIAN_STATES = [
  "Andaman & Nicobar",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// Helper to compute geographic bounds from any GeoJSON feature coordinates
function getGeoJsonBounds(feature) {
  if (!feature || !feature.geometry) return null;
  const b = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
  function walk(coords) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lat < b.minLat) b.minLat = lat;
      if (lat > b.maxLat) b.maxLat = lat;
      if (lng < b.minLng) b.minLng = lng;
      if (lng > b.maxLng) b.maxLng = lng;
    } else {
      for (const c of coords) walk(c);
    }
  }
  walk(feature.geometry.coordinates);
  if (b.minLat > b.maxLat) return null;
  return [[b.minLat, b.minLng], [b.maxLat, b.maxLng]];
}



// ============================================================
// REMAINING COUNTDOWN HELPER
// ============================================================
function getRemainingTime(request) {
  try {
    const endTimeStr =
      request?.recommendedBlock?.endTime ||
      request?.raw?.preferred_end_time ||
      request?.raw?.scheduled_end_time ||
      "21:00";
    const reqDateStr =
      request?.date ||
      request?.raw?.requested_date ||
      request?.raw?.from_date ||
      new Date().toISOString().split("T")[0];
    const [h, m] = endTimeStr.split(":").map(Number);
    const endDateTime = new Date(`${reqDateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    const now = new Date();
    const diffMs = endDateTime - now;
    if (diffMs <= 0) return { expired: true, text: "Window Expired", hours: 0, mins: 0, pct: 100 };
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const totalDuration = Number(request?.raw?.estimated_duration_minutes || request?.duration || 120);
    const elapsedMins = Math.max(0, totalDuration - diffMins);
    const pct = Math.min(100, Math.max(5, Math.round((elapsedMins / totalDuration) * 100)));
    return {
      expired: false,
      text: hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`,
      hours,
      mins,
      pct,
    };
  } catch {
    return { expired: false, text: "Active Window", hours: 1, mins: 30, pct: 50 };
  }
}

// ============================================================
// MAP CONTROLLER — auto-zoom to selected state, track or train route
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

function MapController({ selectedTrack, detourRoute, selectedTrainRoute, networkScope, selectedStateBounds, centerTarget }) {
  const map = useMap();

  useEffect(() => {
    // 1. Immediate Center Target Request
    if (centerTarget && Array.isArray(centerTarget) && centerTarget.length === 2) {
      map.setView(centerTarget, 10, { animate: true });
      return;
    }

    // 2. High priority: State selection zoom
    if (selectedStateBounds) {
      map.fitBounds(selectedStateBounds, { padding: [45, 45], maxZoom: 8, animate: true });
      return;
    }

    // 3. Train route trace zoom
    if (selectedTrainRoute?.route_geometry?.coordinates?.length) {
      const coords = selectedTrainRoute.route_geometry.coordinates;
      const latLngs = coords.map((c) => [c[1], c[0]]);
      map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 10 });
      return;
    }

    // 4. Track selection zoom
    if (selectedTrack) {
      const coords = selectedTrack.geometry?.coordinates;
      if (!coords || coords.length === 0) return;

      const allCoordinates = detourRoute?.coordinates?.length ? [...coords, ...detourRoute.coordinates] : coords;
      const latLngs = allCoordinates.map((c) => [c[1], c[0]]);
      map.fitBounds(latLngs, { padding: [60, 60], maxZoom: 14 });
      return;
    }

    // 5. Default baseline view
    if (networkScope === "india") {
      map.setView([22.5, 79.5], 5, { animate: true });
    } else {
      map.setView([15.3173, 75.7139], 7, { animate: true });
    }
  }, [selectedTrack, detourRoute, selectedTrainRoute, networkScope, selectedStateBounds, centerTarget, map]);

  return null;
}

function getOwnedRequestIdsForUser(usernameOrId) {
  if (!usernameOrId) return new Set();
  try {
    const raw = localStorage.getItem(`rbps_my_requests_${usernameOrId}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}

function saveOwnedRequestIdForUser(usernameOrId, requestId) {
  if (!usernameOrId || !requestId) return;
  try {
    const set = getOwnedRequestIdsForUser(usernameOrId);
    set.add(requestId);
    localStorage.setItem(`rbps_my_requests_${usernameOrId}`, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

function checkIsOwnAssigned(match, user, isEngineer) {
  if (!isEngineer || !user) return false;

  const userKey = user.username || user.id || user.name;
  const userOwnedIds = getOwnedRequestIdsForUser(userKey);
  const reqId = match.id || match.request_id || match.raw?.request_id;
  if (reqId && userOwnedIds.has(reqId)) {
    return true;
  }

  const cleanUserUname = (user.username || "").trim().toLowerCase();
  const cleanUserName = (user.name || "").trim().toLowerCase();
  const rawCreatorUname = (match.raw?.created_by_username || match.created_by_username || "").trim().toLowerCase();
  const rawCreatorName = (match.raw?.created_by_name || match.created_by_name || "").trim().toLowerCase();

  // Explicit username match
  if (cleanUserUname && rawCreatorUname && cleanUserUname === rawCreatorUname) {
    return true;
  }

  // Explicit user full name match
  if (cleanUserName && rawCreatorName && cleanUserName === rawCreatorName) {
    return true;
  }

  // Explicit non-default user ID match
  if (user.id && (match.raw?.created_by === user.id || match.created_by === user.id)) {
    if (match.raw?.created_by === 3 || match.created_by === 3 || match.raw?.created_by === 4) {
      return cleanUserUname === "eng_team" || cleanUserName === "engineering team" || cleanUserName === "engineering team lead";
    }
    return true;
  }

  // Default seed requests (created_by 3 or 4) belong specifically to the primary "Engineering Team" / "eng_team" account
  const isDefaultSeed = match.raw?.created_by === 3 || match.created_by === 3 || match.raw?.created_by === 4;
  if (isDefaultSeed) {
    return cleanUserUname === "eng_team" || cleanUserName === "engineering team" || cleanUserName === "engineering team lead";
  }

  return false;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function LiveMap({ isSubmitDefault = false }) {
  const { user } = useAuth();
  const isEngineer = user?.role === "teams";

  const location = useLocation();
  const isRequestsRoute = location.pathname.includes("/requests");

  // ----------------------------------------------------------
  // SUBMIT REQUEST MODE & FORM STATE
  // ----------------------------------------------------------
  const [isSubmitMode, setIsSubmitMode] = useState(true); // By default show tracks and allow selection
  const [selectedRequestTracks, setSelectedRequestTracks] = useState([]);
  const [isSubmitDrawerOpen, setIsSubmitDrawerOpen] = useState(false);
  const [requestStep, setRequestStep] = useState(1); // 1 = Trains Inspection, 2 = Specify Details
  const [trafficFilterStep1, setTrafficFilterStep1] = useState("ALL"); // "ALL" | "PASSENGER" | "GOODS"
  const [trafficFilterDock, setTrafficFilterDock] = useState("ALL"); // "ALL" | "PASSENGER" | "GOODS"
  const [selectedOngoingWork, setSelectedOngoingWork] = useState(null); // When clicking an ongoing (red) work
  const [submitSuccessId, setSubmitSuccessId] = useState(null);
  const [idCopied, setIdCopied] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [submitReqError, setSubmitReqError] = useState("");

  // Helper to format or synthesize estimated scheduled train passage times (Passenger & Freight)
  const getEstimatedTrainsForTrack = (feature, serverSchedules) => {
    const trackId = feature?.properties?.track_id || feature?.properties?.section_id || "TRK";
    const fromStn = feature?.properties?.from_station_name || feature?.properties?.from_station || "Station A";
    const toStn = feature?.properties?.to_station_name || feature?.properties?.to_station || "Station B";

    let combined = [];

    if (Array.isArray(serverSchedules) && serverSchedules.length > 0) {
      combined = serverSchedules.map((s) => {
        const arr = s.arrival || s.arrival_time;
        const dep = s.departure || s.departure_time;
        let estWindow = "Scheduled";
        if (arr && dep) estWindow = `Est. ~${arr.slice(0, 5)} - ${dep.slice(0, 5)}`;
        else if (dep) estWindow = `Est. passage ~${dep.slice(0, 5)}`;
        else if (arr) estWindow = `Est. passage ~${arr.slice(0, 5)}`;

        const isFreight = isFreightTrain(s) || s.type === "GOODS" || s.isFreight || String(s.trainNo || s.train_no).startsWith("G-");

        return {
          ...s,
          trainNo: s.trainNo || s.train_no,
          trainName: s.trainName || s.train_name,
          type: isFreight ? (s.rakeType ? `GOODS (${s.rakeType})` : "GOODS") : (s.type || s.train_type || "EXP"),
          rawType: s.type || s.train_type || (isFreight ? "GOODS" : "EXP"),
          isFreight,
          rakeType: s.rakeType || (isFreight ? "BOXN" : null),
          commodity: s.commodity || (isFreight ? "Heavy Freight / Industrial" : null),
          grossTonnage: s.grossTonnage || (isFreight ? 4500 : null),
          wagonCount: s.wagonCount || (isFreight ? 58 : null),
          locoClass: s.locoClass || (isFreight ? "WAG-9H" : "WAP-7"),
          traction: s.traction || (isFreight ? "25kV AC Electric" : "25kV AC Electric"),
          source: s.source || s.source_station || s.source_station_name || "Origin",
          destination: s.destination || s.destination_station || s.destination_station_name || "Destination",
          estimatedWindow: s.scheduledWindow || estWindow,
        };
      });

      // If server schedules only have passenger trains, supplement with official scheduled freight for this track
      const hasFreight = combined.some((t) => t.isFreight);
      if (!hasFreight) {
        const freightList = getScheduledFreightForTrack(trackId).map((f) => ({
          ...f,
          isFreight: true,
          rawType: "GOODS",
          type: `GOODS (${f.rakeType || "BOXN"})`,
          estimatedWindow: f.scheduledWindow || `Est. ~${f.dep} - ${f.arr}`,
        }));
        combined = [...combined, ...freightList];
      }
    } else {
      let charSum = 0;
      for (let i = 0; i < trackId.length; i++) charSum += trackId.charCodeAt(i);

      // Balanced mix of official scheduled passenger and scheduled time-tabled freight
      const passengerTemplates = [
        { no: "12627", name: "Karnataka Express", type: "SUPERFAST", dep: "06:45", arr: "07:10", traction: "25kV AC Electric", locoClass: "WAP-7" },
        { no: "20607", name: "Vande Bharat Express", type: "VANDE BHARAT", dep: "09:30", arr: "09:50", traction: "25kV AC Electric", locoClass: "Trainset" },
        { no: "16525", name: "Island Express", type: "EXPRESS", dep: "13:20", arr: "13:45", traction: "25kV AC Electric", locoClass: "WAP-7" },
        { no: "12951", name: "Rajdhani Express", type: "RAJDHANI", dep: "17:15", arr: "17:35", traction: "25kV AC Electric", locoClass: "WAP-7" },
        { no: "12650", name: "Sampark Kranti", type: "SUPERFAST", dep: "21:40", arr: "22:05", traction: "25kV AC Electric", locoClass: "WAP-7" },
      ];

      const passList = passengerTemplates.map((t, idx) => ({
        trainNo: String(Number(t.no) + (charSum % 80)),
        trainName: t.name,
        type: t.type,
        rawType: t.type,
        isFreight: false,
        source: idx % 2 === 0 ? fromStn : toStn,
        destination: idx % 2 === 0 ? toStn : fromStn,
        estimatedWindow: `Est. ~${t.dep} - ${t.arr}`,
        locoClass: t.locoClass,
        traction: t.traction,
        operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      }));

      const freightList = getScheduledFreightForTrack(trackId).map((f) => ({
        ...f,
        isFreight: true,
        rawType: "GOODS",
        type: `GOODS (${f.rakeType || "BOXN"})`,
        source: f.source || fromStn,
        destination: f.destination || toStn,
        estimatedWindow: f.scheduledWindow || `Est. ~${f.dep} - ${f.arr}`,
      }));

      combined = [...passList, ...freightList];
    }

    return combined;
  };

  const resolveUserDepartment = () => {
    if (!user?.department) return departments[0];
    const uDept = user.department.toLowerCase();
    if (uDept.includes("s&t") || uDept.includes("signal") || uDept.includes("smms")) {
      return "Signal & Telecom (SMMS)";
    }
    if (uDept.includes("trac") || uDept.includes("ohe") || uDept.includes("tdms")) {
      return "Traction Distribution";
    }
    return "Engineering";
  };

  const [requestForm, setRequestForm] = useState({
    department: resolveUserDepartment(),
    assetType: "Track",
    maintenanceType: "Routine Maintenance",
    assetCondition: "Good",
    workDescription: "",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    durationMinutes: 120,
  });

  useEffect(() => {
    if (user?.department) {
      setRequestForm((prev) => ({ ...prev, department: resolveUserDepartment() }));
    }
  }, [user]);

  const initialRouteIntent = useMemo(() => {
    if (location.state?.trackId) return location.state;
    const params = new URLSearchParams(location.search);
    const preview = params.get("preview");
    if ((preview !== "diversion" && preview !== "reroute") || !params.get("track")) return null;
    return {
      trackId: params.get("track"),
      requestId: params.get("request"),
      detourAlternative: {
        type: "DIVERSION",
        trainImpact: `Diversion +${params.get("extraKm") || 14} km`,
        delayMinutes: Number(params.get("delay") || 20),
      },
    };
  }, [location.search, location.state]);

  const [tracks, setTracks] = useState(null);
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

  // State Boundary & Dropdown state
  const [selectedState, setSelectedState] = useState("ALL");
  const [statesGeoJson, setStatesGeoJson] = useState(null);
  const [centerTarget, setCenterTarget] = useState(null);

  // Left Category Dock state
  const [activeCategory, setActiveCategory] = useState("trains"); // "trains" | "works"
  const [trainSubTab, setTrainSubTab] = useState("all"); // "all" | "running" | "upcoming"
  const [trainTypeFilter, setTrainTypeFilter] = useState("ALL");
  const [trainZoneFilter, setTrainZoneFilter] = useState("ALL");
  const [workFilter, setWorkFilter] = useState("all"); // "all" | "active" | "completed"
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Pan-India All 5,208 Trains Directory State
  const [allTrains, setAllTrains] = useState([]);
  const [allTrainsTotal, setAllTrainsTotal] = useState(5208);
  const [allTrainsLoading, setAllTrainsLoading] = useState(false);
  const [allTrainsOffset, setAllTrainsOffset] = useState(0);

  // Dynamic Upcoming Departures State
  const [upcomingTrains, setUpcomingTrains] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  // Live maintenance requests and completion override state
  const [requests, setRequests] = useState([]);
  const [completedMap, setCompletedMap] = useState({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [detourCaseId] = useState(initialRouteIntent?.requestId || null);
  const [detourRequested] = useState(Boolean(initialRouteIntent?.detourAlternative));

  const [showDetourLayer, setShowDetourLayer] = useState(true);

  // Pan-India vs Regional Scope
  const [networkScope, setNetworkScope] = useState("india");
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Train Route Selection & Search
  const [selectedTrainRoute, setSelectedTrainRoute] = useState(null);
  const [loadingTrainRoute, setLoadingTrainRoute] = useState(false);
  const [trainSearchQuery, setTrainSearchQuery] = useState("");
  const [trainSearchResults, setTrainSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const geoJsonRef = useRef(null);
  const routeIntentRef = useRef(initialRouteIntent);
  const routeIntentHandledRef = useRef(false);

  // ----------------------------------------------------------
  // LOAD STATES GEOJSON FOR BORDER HIGHLIGHTING
  // ----------------------------------------------------------
  useEffect(() => {
    fetch("/india_states.geojson")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load states GeoJSON");
      })
      .then((data) => {
        setStatesGeoJson(data);
      })
      .catch((err) => console.warn("Could not load states geojson:", err));
  }, []);

  const selectedStateFeature = useMemo(() => {
    if (!statesGeoJson || selectedState === "ALL") return null;
    return (
      statesGeoJson.features?.find(
        (f) => f.properties?.ST_NM?.toLowerCase() === selectedState.toLowerCase()
      ) || null
    );
  }, [statesGeoJson, selectedState]);

  const selectedStateBounds = useMemo(() => {
    if (!selectedStateFeature) return null;
    return getGeoJsonBounds(selectedStateFeature);
  }, [selectedStateFeature]);

  const handleSelectState = (stateName) => {
    setSelectedState(stateName);
    setCenterTarget(null);
    if (stateName !== "ALL") {
      if (networkScope !== "india") {
        setNetworkScope("india");
      }
      setSelectedTrack(null);
      setSelectedTrainRoute(null);
    }
  };

  // ----------------------------------------------------------
  // HIGH-PERFORMANCE PRECOMPUTED MAINTENANCE TRACK MAP (O(1) HASH LOOKUP)
  // Replaces 1.4 million loop iterations per frame with zero-overhead lookups
  // ----------------------------------------------------------
  const maintenanceTrackMap = useMemo(() => {
    const map = new Map();
    if (!requests || requests.length === 0) return map;

    for (const match of requests) {
      const isApproved =
        match.status === "Approved" ||
        match.status === "APPROVED" ||
        match.status === "Completed" ||
        match.status === "COMPLETED" ||
        match.raw?.status === "APPROVED" ||
        match.raw?.status === "COMPLETED" ||
        match.raw?.status === "SCHEDULED" ||
        match.raw?.status === "IN_PROGRESS";

      if (!isApproved) continue;

      const tId = match.raw?.track_id || match.track_id || match.recommendedBlock?.trackId;
      const tIds = match.raw?.track_ids || match.track_ids || (tId ? [tId] : []);

      const reqId = match.id;
      const isExplicitCompleted =
        match.status === "Completed" ||
        match.status === "COMPLETED" ||
        match.raw?.status === "COMPLETED";

      const isManuallyFinished = Boolean(completedMap && completedMap[reqId]);
      const isFinished = isExplicitCompleted || isManuallyFinished;

      // Check if this track is assigned to the currently logged in engineer
      const isOwnAssigned = checkIsOwnAssigned(match, user, isEngineer);

      // Color coding rule:
      // Completed: Green (#16a34a)
      // Engineer's own assigned tracks (current/upcoming): Orange (#ea580c)
      // Current or upcoming maintenance (and other engineers): Red (#dc2626)
      let color;
      if (isFinished) {
        color = "#16a34a"; // Green
      } else if (isEngineer && isOwnAssigned) {
        color = "#ea580c"; // Orange for own assigned
      } else {
        color = "#dc2626"; // Red
      }

      const maintObj = {
        request: match,
        isFinished,
        isOwnAssigned,
        color,
        statusText: isFinished
          ? "Completed maintenance"
          : (isEngineer && isOwnAssigned ? "Your Assigned Track (In Progress)" : "Active / Upcoming maintenance"),
        team: match.department || match.raw?.department || "Engineering Team",
        maintenanceType: match.type || match.raw?.task_type || "Track Maintenance",
        allocatedDate: match.date || match.raw?.requested_date || match.recommendedBlock?.date || "2026-09-10",
        allocatedTime: `${match.recommendedBlock?.startTime || match.raw?.preferred_start_time || "19:00"} - ${match.recommendedBlock?.endTime || match.raw?.preferred_end_time || "21:00"}`,
        duration: match.raw?.estimated_duration_minutes || match.raw?.durationMinutes || 120,
        description: match.reason || match.raw?.description || "Track possession work",
        requestId: match.id,
        reqId: match.id,
        trackId: tId,
      };

      for (const trackId of tIds) {
        if (trackId) map.set(trackId, maintObj);
      }
    }

    return map;
  }, [requests, completedMap, isEngineer, user]);

  const getTrackState = (trackId) => {
    if (!trackId) return null;
    return maintenanceTrackMap.get(trackId) || null;
  };

  const DEFAULT_TRACK_STYLE = useMemo(() => ({
    color: "#2563eb",
    weight: 2.2,
    opacity: 0.65,
  }), []);

  const trackStyle = (feature) => {
    const trackId = feature.properties?.track_id;

    // 1. Confirmed / ongoing / completed work on this track:
    // Red for current/upcoming, Green for completed, Orange for engineer's own assigned track
    const maint = maintenanceTrackMap.get(trackId);
    if (maint) {
      return {
        color: maint.color,
        weight: 8,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      };
    }

    // 2. Currently selected track for inspection / request
    const isSelected = selectedTrack?.properties?.track_id === trackId || selectedRequestTracks.includes(trackId?.toUpperCase());
    if (isSelected) {
      return {
        color: "#059669", // Vibrant Emerald Green for selected track
        weight: 7,
        opacity: 1,
      };
    }

    // 3. For Officers: DO NOT SHOW BLUE TRACKS!
    if (!isEngineer) {
      return {
        stroke: false,
        opacity: 0,
        weight: 0,
        fillOpacity: 0,
      };
    }

    // Physical Railway Network Lines for Engineer (restored back to standard railway blue)
    return {
      color: "#2563eb",
      weight: 2.2,
      opacity: 0.65,
    };
  };

  // ----------------------------------------------------------
  // LOAD REAL RAILWAY GEOJSON (Pan-India or Regional)
  // ----------------------------------------------------------
  useEffect(() => {
    setLoadingTracks(true);
    fetchTracks(networkScope)
      .then((data) => {
        setTracks(data);
      })
      .catch((err) => {
        console.error("Error loading tracks:", err);
      })
      .finally(() => {
        setLoadingTracks(false);
      });
  }, [networkScope]);

  // Polling for maintenance requests
  useEffect(() => {
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

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ----------------------------------------------------------
  // TRAIN ROUTE SELECTION & SEARCH HANDLERS
  // ----------------------------------------------------------
  const handleSelectTrainRoute = async (trainNo) => {
    if (!trainNo) return;
    setLoadingTrainRoute(true);
    setShowSearchDropdown(false);
    setCenterTarget(null);
    try {
      const data = await fetchTrainRoute(trainNo);
      if (data && !data.error) {
        setSelectedTrainRoute(data);
        setSelectedTrack(null);
      }
    } catch (err) {
      console.error("Error loading train route:", err);
    } finally {
      setLoadingTrainRoute(false);
    }
  };

  const handleClearTrainRoute = () => {
    setSelectedTrainRoute(null);
    setCenterTarget(null);
  };

  // Load All Trains directory with pagination, search, type, and zone filter
  const loadAllTrains = async (reset = false) => {
    setAllTrainsLoading(true);
    try {
      const offset = reset ? 0 : allTrainsOffset;
      const data = await fetchTrainsList({
        search: trainSearchQuery.trim(),
        type: trainTypeFilter,
        zone: trainZoneFilter,
        limit: 50,
        offset,
      });

      const list = data.trains || [];
      if (reset) {
        setAllTrains(list);
        setAllTrainsOffset(list.length);
      } else {
        setAllTrains((prev) => [...prev, ...list]);
        setAllTrainsOffset((prev) => prev + list.length);
      }
      setAllTrainsTotal(data.total || 0);
    } catch (err) {
      console.warn("Could not load all trains directory:", err);
    } finally {
      setAllTrainsLoading(false);
    }
  };

  // Reload directory when filters or search change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAllTrains(true);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainSearchQuery, trainTypeFilter, trainZoneFilter]);

  // Load upcoming trains when switching to upcoming tab or changing zone
  useEffect(() => {
    if (trainSubTab === "upcoming") {
      setUpcomingLoading(true);
      fetchUpcomingTrains({ zone: trainZoneFilter, type: trainTypeFilter, limit: 50 })
        .then((list) => {
          setUpcomingTrains(Array.isArray(list) ? list : []);
        })
        .catch((e) => console.warn("Could not load upcoming trains:", e))
        .finally(() => setUpcomingLoading(false));
    }
  }, [trainSubTab, trainZoneFilter, trainTypeFilter]);

  // Autocomplete search dropdown effect
  useEffect(() => {
    if (!trainSearchQuery || trainSearchQuery.trim().length < 2) {
      setTrainSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await fetchTrainsList(trainSearchQuery.trim(), 10);
        setTrainSearchResults(Array.isArray(results) ? results : (results.trains || []));
        setShowSearchDropdown(true);
      } catch (e) {
        console.warn("Search trains failed:", e);
      }
    }, 180);
    return () => clearTimeout(timeout);
  }, [trainSearchQuery]);


  // ----------------------------------------------------------
  // LOAD SCHEDULE + CONFLICT + AI for a selected track
  // ----------------------------------------------------------
  const loadTrackDetails = async (feature, day = selectedDay, options = {}) => {
    const trackId = feature.properties.track_id;
    setSelectedTrack(feature);
    setSelectedTrainRoute(null);
    setCenterTarget(null);
    setActiveDetour(options.detour || null);
    setDetourHidden(false);
    setLoadingDetails(true);
    setSchedules([]);
    setConflictData(null);
    setAgentPlan(null);

    const maint = getTrackState(trackId, requests, completedMap);
    setActiveTab(options.detour ? "ai" : (maint ? "maintenance" : "trains"));

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

      const conflict = await checkConflict({
        trackId,
        date: "2026-09-15",
        startTime: "19:00",
        endTime: "20:30",
      });
      setConflictData(conflict);

      const matchingReq = requests.find((r) =>
        (detourCaseId && (r.id === detourCaseId || r.request_id === detourCaseId)) ||
        (r.raw?.track_id === trackId || r.track_id === trackId || (r.raw?.track_ids || r.track_ids || []).includes(trackId))
      );
      const reqTrackIds = matchingReq?.raw?.track_ids || matchingReq?.track_ids || [trackId];

      let plan = matchingReq?.agentPlan || matchingReq?.agent_plan || null;
      if (!plan || !plan.alternatives?.length) {
        plan = await fetchAgentPlan({
          trackId,
          trackIds: reqTrackIds,
          planningDate: matchingReq?.date || matchingReq?.requested_date || "2026-09-15",
          startTime: matchingReq?.raw?.preferred_start_time || "19:00",
          endTime: matchingReq?.raw?.preferred_end_time || "20:30",
          durationMinutes: matchingReq?.raw?.estimated_duration_minutes || 90,
        });
      }
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
        await updateRequestStatus(reqId, "Completed", "COMPLETED", "Officer/Engineer marked possession finished on live map.");
      } else {
        await updateRequestStatus(reqId, "Approved", "APPROVED", "Officer/Engineer re-opened possession on live map.");
      }
      const updated = await fetchRequests();
      if (Array.isArray(updated)) setRequests(updated);
    } catch (e) {
      console.warn("Status update error:", e);
    }
  };

  // ----------------------------------------------------------
  // SUBMIT REQUEST TRACK SELECTION & FORM SUBMISSION
  // ----------------------------------------------------------
  const handleToggleRequestTrack = (trackId, feature) => {
    if (!trackId) return;
    const normId = trackId.toUpperCase();
    setSelectedRequestTracks((prev) => {
      const exists = prev.includes(normId);
      if (exists) {
        return prev.filter((id) => id !== normId);
      } else {
        return [...prev, normId];
      }
    });
    setSelectedTrack(feature);
    setIsSubmitDrawerOpen(true);
    setSubmitSuccessId(null);
    setSubmitReqError("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (selectedRequestTracks.length === 0) {
      setSubmitReqError("Please select at least one railway track on the map before submitting.");
      return;
    }
    setSubmitReqError("");
    setSubmittingReq(true);
    try {
      const generatedReqId = buildRequestId(requestForm.department, requests.length);
      const userKey = user?.username || user?.id || user?.name || "current_user";
      const payload = {
        requestId: generatedReqId,
        department: requestForm.department,
        trackIds: selectedRequestTracks,
        assetType: requestForm.assetType,
        maintenanceType: requestForm.maintenanceType,
        assetCondition: requestForm.assetCondition,
        workDescription: requestForm.workDescription,
        fromDate: requestForm.fromDate,
        toDate: requestForm.toDate,
        durationMinutes: requestForm.durationMinutes,
        createdBy: user?.id,
        createdByUsername: user?.username,
        createdByName: user?.name,
        created_by_username: user?.username,
        created_by_name: user?.name,
      };
      const res = await submitRequest(payload);
      if (res.success) {
        const finalId = res.requestId || generatedReqId;
        saveOwnedRequestIdForUser(userKey, finalId);
        setSubmitSuccessId(finalId);
        const refreshed = await fetchRequests();
        if (Array.isArray(refreshed)) setRequests(refreshed);
      } else {
        setSubmitReqError(res.message || "Request submission failed. Please try again.");
      }
    } catch (err) {
      setSubmitReqError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmittingReq(false);
    }
  };

  // ----------------------------------------------------------
  // HOVER / CLICK HANDLERS FOR EACH SEGMENT
  // ----------------------------------------------------------
  const onEachTrack = (feature, layer) => {
    const trackId = feature.properties?.track_id;
    const maint = maintenanceTrackMap.get(trackId);

    if (maint) {
      const statusLabel = maint.isFinished
        ? `<span style="color:#16a34a;font-weight:bold;">✅ Completed Maintenance</span>`
        : (maint.isOwnAssigned
          ? `<span style="color:#ea580c;font-weight:bold;">🔶 Your Assigned Track (In Progress)</span>`
          : `<span style="color:#dc2626;font-weight:bold;">🚨 ${isEngineer ? "Other Engineer Work" : "Active Work in Progress"}</span>`);

      const tooltipHtml = `<strong>${trackId}</strong><br/>${statusLabel}<br/><small style="color:#475569;">${maint.team} • ${maint.maintenanceType}</small><br/><small style="color:#64748b;">${maint.allocatedTime}</small><br/><span style="color:${maint.color};font-weight:bold;font-size:11px;">👉 Click to view details</span>`;

      layer.bindTooltip(tooltipHtml, { sticky: true, className: "track-tooltip" });

      layer.on({
        click: () => {
          setSelectedOngoingWork(maint);
          setSelectedTrack(feature);
          setSelectedRequestTracks([]);
          const b = getGeoJsonBounds(feature);
          if (b) {
            setCenterTarget([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]);
          }
        },
      });
    } else if (isEngineer) {
      const fromStn = feature.properties?.from_station_name || feature.properties?.from_station || "";
      const toStn = feature.properties?.to_station_name || feature.properties?.to_station || "";
      const stnText = fromStn && toStn ? `<br/><span style="color:#2563eb;">${fromStn} ↔ ${toStn}</span>` : "";
      layer.bindTooltip(`<strong>${trackId}</strong>${stnText}<br/><span style="color:#059669;font-weight:bold;">✓ Click to inspect trains & request</span>`, { sticky: true, className: "track-tooltip" });

      layer.on({
        click: () => {
          setSelectedOngoingWork(null);
          setSelectedRequestTracks([trackId.toUpperCase()]);
          setRequestStep(1); // Step 1: Trains
          loadTrackDetails(feature);
        },
      });
    }
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
      (alternative) => (alternative.type !== "REROUTE" && alternative.type !== "DIVERSION") || alternative.routeGeometry?.coordinates?.length > 1
    ),
    [agentPlan]
  );
  const agentReroute = validAgentAlternatives.find((alternative) => alternative.type === "REROUTE" || alternative.type === "DIVERSION") || null;
  const displayedDetour = (detourHidden || !showDetourLayer) ? null : (
    activeDetour?.routeGeometry?.coordinates?.length > 1
      ? activeDetour
      : (detourRequested ? agentReroute : activeDetour)
  );
  const detourRoute = useMemo(
    () => (displayedDetour?.type === "REROUTE" || displayedDetour?.type === "DIVERSION") ? buildDetourRoute(selectedTrack, displayedDetour) : null,
    [selectedTrack, displayedDetour]
  );

  const selectedMaint = selectedTrack
    ? getTrackState(selectedTrack.properties?.track_id, requests, completedMap)
    : null;

  // Active and finished possessions computation
  let activeMaintCount = 0;
  let finishedMaintCount = 0;
  const activeMaintTracks = [];

  requests.forEach((r) => {
    const isApproved =
      r.status === "Approved" ||
      r.status === "APPROVED" ||
      r.status === "Completed" ||
      r.status === "COMPLETED" ||
      r.raw?.status === "APPROVED" ||
      r.raw?.status === "COMPLETED" ||
      r.raw?.status === "SCHEDULED" ||
      r.raw?.status === "IN_PROGRESS";

    const isDone =
      r.status === "Completed" ||
      r.status === "COMPLETED" ||
      r.raw?.status === "COMPLETED" ||
      Boolean(completedMap[r.id]);

    const tId = r.raw?.track_id || r.track_id || r.recommendedBlock?.trackId;

    const isOwnAssigned = checkIsOwnAssigned(r, user, isEngineer);

    let color = "#dc2626";
    if (isDone) {
      color = "#16a34a"; // Green
    } else if (isEngineer && isOwnAssigned) {
      color = "#ea580c"; // Orange for own assigned
    }

    if (isApproved && tId) {
      if (isDone) {
        finishedMaintCount++;
      } else {
        activeMaintCount++;
      }

      if (!activeMaintTracks.some((x) => x.trackId === tId)) {
        activeMaintTracks.push({
          trackId: tId,
          team: r.department || r.raw?.department || "Team",
          maintenanceType: r.type || r.raw?.task_type || "Maintenance",
          isFinished: isDone,
          isOwnAssigned,
          color,
          reqId: r.id,
          request: r,
          allocatedTime: `${r.recommendedBlock?.startTime || r.raw?.preferred_start_time || "19:00"} - ${r.recommendedBlock?.endTime || r.raw?.preferred_end_time || "21:00"}`,
          allocatedDate: r.date || r.raw?.requested_date || "2026-09-10",
        });
      }
    }
  });

  // Filtered maintenance list for Category 2 (Works)
  const filteredWorks = useMemo(() => {
    if (workFilter === "active") return activeMaintTracks.filter((w) => !w.isFinished);
    if (workFilter === "completed") return activeMaintTracks.filter((w) => w.isFinished);
    return activeMaintTracks;
  }, [activeMaintTracks, workFilter]);

  // Jump to track from dock
  const handleJumpToTrack = (trackId) => {
    const maint = maintenanceTrackMap.get(trackId);
    if (!tracks) return;
    const feat = tracks.features?.find(
      (f) => f.properties?.track_id?.toUpperCase() === trackId?.toUpperCase()
    );
    if (feat) {
      if (maint) {
        setSelectedOngoingWork(maint);
        setSelectedTrack(feat);
        setSelectedRequestTracks([]);
        const b = getGeoJsonBounds(feat);
        if (b) {
          setCenterTarget([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]);
        }
      } else {
        loadTrackDetails(feat);
      }
    } else {
      setSearchId(trackId);
      handleSearch();
    }
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden select-none">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 relative">

          {/* ── TOP MINIMAL STATUS & CONTROL BAR ── */}
          <div className="h-13 bg-white border-b border-gray-200 px-3 md:px-4 flex items-center justify-between shrink-0 z-20 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              {/* Dock Toggle Button — Only for non-engineers */}
              {!isEngineer && (
                <button
                  type="button"
                  onClick={() => setIsDockCollapsed((prev) => !prev)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    !isDockCollapsed
                      ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                      : "bg-[#171918] border-black text-white hover:bg-black"
                  }`}
                  title={isDockCollapsed ? "Open Operations Dock" : "Collapse Operations Dock"}
                >
                  <Sliders size={14} />
                  <span className="hidden sm:inline">{isDockCollapsed ? "Show Dock" : "Dock"}</span>
                  {isDockCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>
              )}

              <div className="flex items-center gap-2 truncate">
                <FileEdit className="text-[#b83825] shrink-0" size={18} />
                <h1 className="text-sm md:text-base font-bold text-gray-900 truncate">
                  {isEngineer ? "Submit Maintenance Request" : "RailSync Live Operations Map"}
                </h1>

                {/* State / India Selector Dropdown */}
                <div className="flex items-center gap-1.5 ml-1">
                  <div className="relative flex items-center">
                    <MapPin size={13} className="absolute left-2.5 text-purple-600 pointer-events-none" />
                    <select
                      aria-label="Select State or All India"
                      value={selectedState}
                      onChange={(e) => handleSelectState(e.target.value)}
                      className="appearance-none bg-purple-50 hover:bg-purple-100/90 border border-purple-300 text-purple-950 font-bold text-xs rounded-lg pl-7 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs transition-colors"
                    >
                      <option value="ALL">🇮🇳 All India (National Network)</option>
                      <optgroup label="States & Union Territories">
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown size={13} className="absolute right-2 text-purple-700 pointer-events-none" />
                  </div>

                  {selectedState !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => handleSelectState("ALL")}
                      className="p-1 rounded-md text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                      title="Reset to All India"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {loadingTracks && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 animate-pulse ml-1">
                    <RefreshCw size={11} className="animate-spin" /> Loading tracks…
                  </span>
                )}
              </div>
            </div>

            {/* Role & Telemetry Counters */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {/* Role Mode Badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                isEngineer
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-blue-50 text-blue-900 border-blue-300"
              }`}>
                {isEngineer ? (
                  <>
                    <HardHat size={13} className="text-amber-700" />
                    <span>Field Engineer View</span>
                  </>
                ) : (
                  <>
                    <Shield size={13} className="text-blue-700" />
                    <span>Traffic Officer View</span>
                  </>
                )}
              </div>

              {/* Status Chips */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                  <Train size={12} className="text-blue-600" />
                  <span>5,208 Trains Ready</span>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-800 border border-red-200 font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span>{activeMaintCount} Active Works</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── WORKSPACE: DEDICATED STEP 2 PAGE FOR ENGINEERS OR MAP WORKSPACE ── */}
          {isEngineer && requestStep === 2 && selectedTrack ? (
            <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-8">
              <div className="max-w-4xl mx-auto space-y-5">
                {/* 1. Header & Breadcrumb Nav */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setRequestStep(1)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-[#b83825] transition-colors cursor-pointer group w-fit"
                  >
                    <div className="p-1.5 rounded-lg bg-white border border-gray-300 group-hover:border-[#b83825] group-hover:bg-red-50 text-gray-600 group-hover:text-[#b83825] transition-colors">
                      <ArrowLeft size={16} />
                    </div>
                    <span>Back to Map & Train Schedules</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRequestStep(1)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Check size={12} className="stroke-[3]" />
                      <span>Step 1: Track Selected</span>
                    </button>
                    <ChevronRight size={14} className="text-gray-400" />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171918] text-white font-bold shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>Step 2: Possession Details</span>
                    </div>
                  </div>
                </div>

                {/* 2. Track Summary Banner */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 md:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                      <Train size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        <span>Selected Track Section</span>
                        <span className="text-emerald-400">•</span>
                        <span className="font-mono">{selectedTrack.properties.section_id || selectedTrack.properties.track_id}</span>
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                        {(selectedTrack.properties.from_station || selectedTrack.properties.from_station_name) ? (
                          <>
                            {selectedTrack.properties.from_station_name || selectedTrack.properties.from_station}{" "}
                            <span className="text-gray-400 font-normal">↔</span>{" "}
                            {selectedTrack.properties.to_station_name || selectedTrack.properties.to_station}
                          </>
                        ) : (
                          selectedTrack.properties.section_id || selectedTrack.properties.track_id
                        )}
                      </h2>
                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Clock size={12} />
                          {getEstimatedTrainsForTrack(selectedTrack, schedules).length} trains scheduled on this section
                        </span>
                        {selectedTrack.properties.state && (
                          <span className="text-gray-500 font-medium">State: {selectedTrack.properties.state}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRequestStep(1)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <Route size={14} />
                    <span>Review Trains on Track</span>
                  </button>
                </div>

                {/* 3. Success Screen or Form */}
                {submitSuccessId ? (
                  <div className="bg-white border border-green-200 rounded-2xl p-8 md:p-10 shadow-sm text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-900">
                      Maintenance Request Submitted Successfully!
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 max-w-lg mx-auto">
                      Your track possession request has been registered and transmitted to the AI Block Planning engine and Officer Review portal.
                    </p>

                    {/* Request ID Banner with 1-click copy */}
                    <div className="my-6 max-w-md mx-auto bg-green-50/80 border border-green-200 rounded-2xl p-4 flex items-center justify-between text-left shadow-2xs">
                      <div>
                        <span className="block text-[11px] font-bold text-green-800 uppercase tracking-wider">
                          Assigned Request ID
                        </span>
                        <span className="block font-mono text-xl font-extrabold text-green-950 mt-0.5">
                          {submitSuccessId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(submitSuccessId);
                          setIdCopied(true);
                          setTimeout(() => setIdCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 bg-[#171918] hover:bg-black text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                      >
                        {idCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        <span>{idCopied ? "Copied!" : "Copy ID"}</span>
                      </button>
                    </div>

                    {/* Summary Card */}
                    <div className="max-w-md mx-auto grid grid-cols-2 gap-3 text-left bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs mb-8">
                      <div>
                        <span className="text-gray-500 font-medium block">Department:</span>
                        <span className="font-bold text-gray-900">{requestForm.department}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Asset & Work:</span>
                        <span className="font-bold text-gray-900">{requestForm.assetType} • {requestForm.maintenanceType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Requested Window:</span>
                        <span className="font-bold text-gray-900">{requestForm.fromDate} to {requestForm.toDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Duration:</span>
                        <span className="font-bold text-gray-900">{requestForm.durationMinutes} mins ({(requestForm.durationMinutes / 60).toFixed(1)} hrs)</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitSuccessId(null);
                          setSelectedRequestTracks([]);
                          setSelectedTrack(null);
                          setRequestStep(1);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-[#b83825] hover:bg-[#8f2c1f] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <Plus size={15} />
                        <span>Submit Another Request</span>
                      </button>
                      <a
                        href="/teams/check-status"
                        className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Track in Status Portal</span>
                        <ArrowRight size={15} />
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleFormSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <FileEdit size={20} className="text-[#b83825]" />
                          <span>Corridor Possession & Work Details</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Specify technical work order parameters, required safety isolation, and requested possession duration.
                        </p>
                      </div>
                      <span className="hidden sm:inline-flex px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
                        Field Engineering Team
                      </span>
                    </div>

                    {submitReqError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium text-xs flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600 shrink-0" />
                        <span>{submitReqError}</span>
                      </div>
                    )}

                    {/* Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Department */}
                      <div>
                        <label className="font-bold text-gray-700 block text-xs mb-1.5">
                          Assigned Department <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={requestForm.department}
                          onChange={(e) => setRequestForm({ ...requestForm, department: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 font-medium text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none transition-all shadow-2xs"
                        >
                          {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Asset Type */}
                      <div>
                        <label className="font-bold text-gray-700 block text-xs mb-1.5">
                          Asset Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={requestForm.assetType}
                          onChange={(e) => setRequestForm({ ...requestForm, assetType: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 font-medium text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none transition-all shadow-2xs"
                        >
                          {assetTypes.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      {/* Maintenance Type */}
                      <div>
                        <label className="font-bold text-gray-700 block text-xs mb-1.5">
                          Maintenance Task Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={requestForm.maintenanceType}
                          onChange={(e) => setRequestForm({ ...requestForm, maintenanceType: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 font-medium text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none transition-all shadow-2xs"
                        >
                          {maintenanceTypes.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* Asset Condition */}
                      <div>
                        <label className="font-bold text-gray-700 block text-xs mb-1.5">
                          Asset Condition Rating <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={requestForm.assetCondition}
                          onChange={(e) => setRequestForm({ ...requestForm, assetCondition: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 font-medium text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none transition-all shadow-2xs"
                        >
                          {assetConditions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* From Date */}
                      <div>
                        <label className="font-bold text-gray-700 block text-xs mb-1.5">
                          Earliest Preferred Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={requestForm.fromDate}
                          onChange={(e) => setRequestForm({ ...requestForm, fromDate: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none transition-all shadow-2xs"
                          required
                        />
                      </div>

                      {/* To Date */}
                      <div>
                        <label className="font-bold text-gray-700 block text-xs mb-1.5">
                          Latest Acceptable Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={requestForm.toDate}
                          onChange={(e) => setRequestForm({ ...requestForm, toDate: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none transition-all shadow-2xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Duration Selection */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-gray-700 text-xs">
                          Corridor Block Duration Needed:
                        </label>
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {requestForm.durationMinutes} minutes ({(requestForm.durationMinutes / 60).toFixed(1)} hours)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[60, 90, 120, 180, 240, 300, 360].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setRequestForm({ ...requestForm, durationMinutes: mins })}
                            className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all shadow-2xs active:scale-[0.97] ${
                              requestForm.durationMinutes === mins
                                ? "bg-[#171918] text-white border-black shadow-xs"
                                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {mins >= 60 ? `${mins / 60} hr${mins / 60 > 1 ? "s" : ""}` : `${mins}m`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Work Description */}
                    <div>
                      <label className="font-bold text-gray-700 block text-xs mb-1.5">
                        Work Description & Safety Isolation Plan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Describe the nature of the track possession, machinery/tower wagons deployed, and safety isolation / signal disconnection requirements..."
                        value={requestForm.workDescription}
                        onChange={(e) => setRequestForm({ ...requestForm, workDescription: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#b83825] focus:border-transparent outline-none resize-none transition-all shadow-2xs"
                        required
                      />
                    </div>

                    {/* Form Actions Footer */}
                    <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setRequestStep(1)}
                        className="px-5 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={15} />
                        <span>Back to Train Schedules</span>
                      </button>

                      <button
                        type="submit"
                        disabled={submittingReq}
                        className={`px-8 py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                          submittingReq
                            ? "bg-gray-700 cursor-wait"
                            : "bg-[#b83825] hover:bg-[#8f2c1f] cursor-pointer active:scale-[0.98]"
                        }`}
                      >
                        {submittingReq ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Transmitting Request to AI Block Planner…</span>
                          </>
                        ) : (
                          <>
                            <Send size={15} />
                            <span>Submit Maintenance Request</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden relative p-2 gap-2">

            {/* ══════════════════════════════════════════════════════ */}
            {/* 1. LEFT CATEGORY DOCK (~360px wide) — NOT FOR ENGINEERS */}
            {/* ══════════════════════════════════════════════════════ */}
            {!isEngineer && (
            <div
              className={`w-80 md:w-92 flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden shrink-0 z-10 transition-all duration-300 ease-in-out ${
                isDockCollapsed ? "-ml-82 md:-ml-94 opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              {/* Dock Category Tabs: Trains and Works */}
              <div className="grid grid-cols-2 bg-gray-100 border-b border-gray-200 p-1 gap-1 text-xs font-bold text-gray-700">
                <button
                  type="button"
                  onClick={() => setActiveCategory("trains")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                    activeCategory === "trains"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                  }`}
                >
                  <Train size={14} />
                  <span>Trains</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-semibold">
                    {allTrainsTotal.toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory("works")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                    activeCategory === "works"
                      ? "bg-white text-red-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                  }`}
                >
                  <Wrench size={14} />
                  <span>Works</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeMaintCount > 0 ? "bg-red-100 text-red-800 font-bold animate-pulse" : "bg-gray-200 text-gray-700"
                  }`}>
                    {activeMaintCount}
                  </span>
                </button>
              </div>

              {/* Dock Category Body */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* ────────────────────────────────────────────────── */}
                {/* CATEGORY 1: ALL TRAINS & SEARCH BAR (NO LABELS)   */}
                {/* ────────────────────────────────────────────────── */}
                {activeCategory === "trains" && (
                  <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2.5">
                    {/* Search Train Autocomplete Input */}
                    <div className="relative shrink-0">
                      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-2xs">
                        <Search size={14} className="ml-2.5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          aria-label="Search trains in India"
                          placeholder="Search 5,208 trains (e.g. 12627, Karnataka, Mumbai, NDLS)…"
                          value={trainSearchQuery}
                          onChange={(e) => {
                            setTrainSearchQuery(e.target.value);
                            setShowSearchDropdown(true);
                          }}
                          onFocus={() => {
                            if (trainSearchResults.length > 0) setShowSearchDropdown(true);
                          }}
                          className="w-full py-1.5 pl-2 pr-2 text-xs focus:outline-none bg-transparent"
                        />
                        {trainSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setTrainSearchQuery("");
                              setTrainSearchResults([]);
                              setShowSearchDropdown(false);
                            }}
                            className="mr-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Suggestions */}
                      {showSearchDropdown && trainSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-300 bg-white shadow-2xl z-50 divide-y divide-gray-100">
                          {trainSearchResults.map((t) => (
                            <button
                              key={t.train_no}
                              type="button"
                              onClick={() => {
                                handleSelectTrainRoute(t.train_no);
                                setTrainSearchQuery(`${t.train_no} - ${t.train_name}`);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-gray-900 truncate">
                                  {t.train_no} · <span className="font-medium text-gray-800">{t.train_name}</span>
                                </p>
                                <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                  <span>{t.source_station_name || t.source_station}</span>
                                  <ArrowRight size={10} className="text-gray-400 shrink-0" />
                                  <span>{t.destination_station_name || t.destination_station}</span>
                                  <span>·</span>
                                  <span>{t.distance_km || 0} km</span>
                                </p>
                              </div>
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                {t.train_type || "EXPRESS"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Showing Count Indicator */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5 shrink-0">
                      <span>Showing {allTrains.length} of {allTrainsTotal.toLocaleString()} trains</span>
                      {allTrainsLoading && (
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <RefreshCw size={11} className="animate-spin" /> Loading…
                        </span>
                      )}
                    </div>

                    {/* Scrollable Train Directory */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100">
                      {allTrains.length === 0 && !allTrainsLoading ? (
                        <div className="p-6 text-center text-gray-400">
                          <Train size={24} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-xs font-semibold text-gray-600">No trains found</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Try a different search keyword.</p>
                        </div>
                      ) : (
                        allTrains.map((train) => {
                          const isSelected = selectedTrainRoute?.train_no === train.train_no;
                          return (
                            <div
                              key={train.train_no}
                              onClick={() => handleSelectTrainRoute(train.train_no)}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-xs"
                                  : "bg-white hover:bg-slate-50 border-gray-200 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-gray-900 truncate flex items-center gap-1.5">
                                    <Train size={13} className="text-blue-600" />
                                    <span>{train.train_no}</span>
                                    <span className="font-semibold text-gray-800 truncate">{train.train_name}</span>
                                  </p>
                                  <div className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                                    <span className="font-medium text-gray-800 truncate">{train.source_station_name || train.source_station}</span>
                                    <ArrowRight size={10} className="text-gray-400 shrink-0" />
                                    <span className="font-medium text-gray-800 truncate">{train.destination_station_name || train.destination_station}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-800">
                                    {train.train_type || "EXP"}
                                  </span>
                                  {train.zone && (
                                    <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1 py-0.2 rounded">
                                      {train.zone}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                                <span className="font-mono text-gray-700">
                                  {train.departure_time ? `${train.departure_time.slice(0, 5)} ➔ ${train.arrival_time?.slice(0, 5) || "--"}` : (train.distance_km ? `${train.distance_km} km` : "Scheduled")}
                                </span>
                                <span className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 text-[10px]">
                                  Inspect Route <Route size={11} />
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {allTrains.length < allTrainsTotal && (
                        <div className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => loadAllTrains(false)}
                            disabled={allTrainsLoading}
                            className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {allTrainsLoading ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Loading next trains…</span>
                              </>
                            ) : (
                              <span>Load More Trains (+50)</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────── */}
                {/* CATEGORY 2: ACTIVE WORKS (MAINTENANCE POSSESSIONS) */}
                {/* ────────────────────────────────────────────────── */}
                {activeCategory === "works" && (
                  <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
                    {/* Filter Pills */}
                    <div className="flex border border-gray-200 rounded-lg p-0.5 bg-gray-100 shrink-0 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setWorkFilter("all")}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          workFilter === "all" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        All ({activeMaintTracks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkFilter("active")}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          workFilter === "active" ? "bg-white text-red-700 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Active ({activeMaintCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkFilter("completed")}
                        className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                          workFilter === "completed" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Done ({finishedMaintCount})
                      </button>
                    </div>

                    {/* Possession Cards List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {filteredWorks.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <CheckCircle2 size={28} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-xs font-medium">No maintenance blocks in this filter</p>
                        </div>
                      ) : (
                        filteredWorks.map((item) => {
                          const countdown = getRemainingTime(item.request);
                          const isSelected = selectedTrack?.properties?.track_id === item.trackId;
                          const isCompleted = item.isFinished;
                          const isOwn = item.isOwnAssigned;

                          return (
                            <div
                              key={item.trackId}
                              onClick={() => handleJumpToTrack(item.trackId)}
                              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-xs"
                                  : isCompleted
                                  ? "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50"
                                  : isOwn
                                  ? "bg-orange-50/50 border-orange-200 hover:bg-orange-50"
                                  : "bg-red-50/50 border-red-200 hover:bg-red-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2.5 h-2.5 rounded-full ${
                                    isCompleted
                                      ? "bg-emerald-600"
                                      : isOwn
                                      ? "bg-orange-500 animate-pulse"
                                      : "bg-red-600 animate-pulse"
                                  }`} />
                                  <span className="font-bold text-xs text-gray-900">{item.trackId}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isOwn
                                    ? "bg-orange-100 text-orange-900 border border-orange-200"
                                    : countdown.expired
                                    ? "bg-red-200 text-red-900 font-bold"
                                    : "bg-red-100 text-red-800 font-bold"
                                }`}>
                                  {isCompleted
                                    ? "Completed"
                                    : isOwn
                                    ? "Assigned to You"
                                    : `⏳ ${countdown.text}`}
                                </span>
                              </div>

                              <p className="text-xs font-semibold text-gray-800 mt-1.5">
                                {item.maintenanceType}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                Assigned: <strong className={isOwn ? "text-orange-800" : ""}>{item.team}</strong>
                              </p>

                              <div className="mt-2 pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-500">
                                <span>{item.allocatedTime}</span>
                                <span style={{ color: item.color }} className="font-bold flex items-center gap-0.5">
                                  Inspect <ArrowRight size={10} />
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* 2. MAIN LEAFLET MAP CANVAS                             */}
            {/* ══════════════════════════════════════════════════════ */}
            <div className="flex-1 flex overflow-hidden rounded-xl border border-gray-200 relative bg-slate-200 shadow-sm">
              <MapContainer
                center={networkScope === "india" ? [22.5, 79.5] : [15.3173, 75.7139]}
                zoom={networkScope === "india" ? 5 : 7}
                minZoom={4}
                preferCanvas={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* ── RAILWAY TRACKS (Shown by default with ongoing works in RED) ── */}
                {tracks && (
                  <GeoJSON
                    ref={geoJsonRef}
                    key={`${networkScope}-${tracks.features.length}-${selectedTrack?.properties?.track_id}-${requests.length}`}
                    data={tracks}
                    style={trackStyle}
                    onEachFeature={onEachTrack}
                  />
                )}


                {/* ── SELECTED TRACK INSTANT HIGHLIGHT OVERLAY (0ms Overhead) ── */}
                {selectedTrack && selectedTrack.geometry?.coordinates && (
                  <Polyline
                    positions={
                      selectedTrack.geometry.type === "LineString"
                        ? selectedTrack.geometry.coordinates.map((c) => [c[1], c[0]])
                        : selectedTrack.geometry.coordinates.flatMap((line) =>
                            Array.isArray(line[0]) ? line.map((c) => [c[1], c[0]]) : [line[1], line[0]]
                          )
                    }
                    pathOptions={{
                      color: "#f59e0b",
                      weight: 7,
                      opacity: 1,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                )}

                {/* ── HIGHLIGHTED STATE BOUNDARY (PURPLE BORDER + SUBTLE VIOLET TINT) ── */}
                {selectedStateFeature && (
                  <>
                    {/* Outer soft glow border */}
                    <GeoJSON
                      key={`state-glow-${selectedState}`}
                      data={selectedStateFeature}
                      interactive={false}
                      style={{
                        color: "#7e22ce",
                        weight: 8,
                        opacity: 0.35,
                        fill: false,
                      }}
                    />
                    {/* Core crisp purple dashed boundary */}
                    <GeoJSON
                      key={`state-border-${selectedState}`}
                      data={selectedStateFeature}
                      interactive={false}
                      style={{
                        color: "#9333ea",
                        weight: 3.5,
                        opacity: 1,
                        dashArray: "8 5",
                        fillColor: "#a855f7",
                        fillOpacity: 0.08,
                      }}
                    />
                  </>
                )}

                {/* Selected Train Route LineString Overlay */}
                {selectedTrainRoute?.route_geometry?.coordinates?.length > 1 && (
                  <>
                    <Polyline
                      positions={selectedTrainRoute.route_geometry.coordinates.map((c) => [c[1], c[0]])}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 5,
                        opacity: 0.95,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-xs font-semibold">
                          🚆 {selectedTrainRoute.train_no} · {selectedTrainRoute.train_name} ({selectedTrainRoute.distance_km || 0} km)
                        </div>
                      </Tooltip>
                    </Polyline>

                    {/* Station stop markers along the route (Key Terminal & Halt Stations) */}
                    {(selectedTrainRoute.stops || [])
                      .filter((stop, idx, arr) => {
                        if (!stop.latitude || !stop.longitude) return false;
                        const isTerminal = idx === 0 || idx === arr.length - 1;
                        const hasHalt = stop.halt_minutes > 0 || (stop.arrival_time && stop.departure_time && stop.arrival_time !== stop.departure_time);
                        return isTerminal || hasHalt || arr.length <= 25 || idx % Math.ceil(arr.length / 20) === 0;
                      })
                      .map((stop, idx, filteredArr) => {
                        const isOrigin = idx === 0;
                        const isDest = idx === filteredArr.length - 1;

                        return (
                          <CircleMarker
                            key={`${stop.station_code}-${idx}`}
                            center={[stop.latitude, stop.longitude]}
                            radius={isOrigin || isDest ? 6 : 3.5}
                            pathOptions={{
                              color: isOrigin ? "#16a34a" : (isDest ? "#dc2626" : "#2563eb"),
                              fillColor: isOrigin ? "#22c55e" : (isDest ? "#ef4444" : "#ffffff"),
                              fillOpacity: 1,
                              weight: isOrigin || isDest ? 2.5 : 1.5,
                            }}
                          >
                            <Tooltip direction="top" offset={[0, -4]}>
                              <div className="text-xs p-0.5">
                                <div className="font-bold text-gray-900 flex items-center gap-1">
                                  <span>{stop.station_name || stop.station_code}</span>
                                  <span className="text-[10px] text-gray-500 font-mono">({stop.station_code})</span>
                                </div>
                                <div className="text-[11px] text-gray-600 mt-0.5">
                                  Arr: {stop.arrival_time || "--"} · Dep: {stop.departure_time || "--"}
                                  {stop.halt_minutes > 0 && ` (${stop.halt_minutes}m halt)`}
                                </div>
                                {stop.distance_from_source_km != null && (
                                  <div className="text-[10px] text-gray-500">
                                    {stop.distance_from_source_km} km · Day {stop.day_count || 1}
                                  </div>
                                )}
                              </div>
                            </Tooltip>
                          </CircleMarker>
                        );
                      })}
                  </>
                )}

                {/* Detour Route Polyline */}
                {showDetourLayer && detourRoute && (
                  <>
                    <Polyline
                      positions={detourRoute.coordinates.map((coordinate) => [coordinate[1], coordinate[0]])}
                      pathOptions={{ color: "#7c3aed", weight: 7, opacity: 0.9, dashArray: "12 9", lineCap: "round" }}
                    >
                      <Tooltip sticky>
                        Suggested diversion · +{detourRoute.extraKm} km · {displayedDetour?.delayMinutes || 20} min
                      </Tooltip>
                    </Polyline>
                    <CircleMarker center={[detourRoute.coordinates[0][1], detourRoute.coordinates[0][0]]} radius={6} pathOptions={{ color: "#5b21b6", fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}><Tooltip>Diversion entry</Tooltip></CircleMarker>
                    <CircleMarker center={[detourRoute.coordinates.at(-1)[1], detourRoute.coordinates.at(-1)[0]]} radius={6} pathOptions={{ color: "#5b21b6", fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}><Tooltip>Diversion exit</Tooltip></CircleMarker>
                  </>
                )}

                <MapController
                  selectedTrack={selectedTrack}
                  detourRoute={detourRoute}
                  selectedTrainRoute={selectedTrainRoute}
                  networkScope={networkScope}
                  selectedStateBounds={selectedStateBounds}
                  centerTarget={centerTarget}
                />
              </MapContainer>

              {/* ── STATE SELECTION FLOATING BANNER ON MAP ── */}
              {selectedState !== "ALL" && (
                <div className="absolute top-3 left-14 z-[999] bg-white/95 backdrop-blur-md border border-purple-300 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs font-bold text-purple-950">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                  <span>Highlighted: {selectedState} State Boundary</span>
                  <button
                    type="button"
                    onClick={() => handleSelectState("ALL")}
                    className="text-purple-600 hover:text-purple-900 ml-1 p-0.5 rounded cursor-pointer"
                    title="Reset to All India"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* ── ENGINEER HELPER BANNER ON MAP ── */}
              {isEngineer && (
                <div className="absolute top-3 left-14 z-[999] bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/60 rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-2.5 text-xs font-semibold max-w-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="leading-tight">
                    {selectedOngoingWork
                      ? `Viewing possession details on ${selectedOngoingWork.trackId}`
                      : selectedTrack
                      ? requestStep === 1
                        ? `Inspecting train traffic on ${selectedTrack.properties.section_id || selectedTrack.properties.track_id}. Click Next to submit.`
                        : `Complete request details for ${selectedTrack.properties.section_id || selectedTrack.properties.track_id}.`
                      : "Click any track to view scheduled trains & submit request. Orange tracks are your work, red tracks are other maintenance."}
                  </span>
                </div>
              )}

              {/* ── FLOATING STATUS & COLOR LEGEND ── */}
              <div className="absolute bottom-6 left-3.5 z-[999] bg-white/95 backdrop-blur-md border border-gray-300/80 rounded-xl p-2.5 shadow-lg text-[11px] flex flex-col gap-1.5 pointer-events-auto">
                <span className="font-bold text-gray-800 text-[10px] uppercase tracking-wider pb-1 border-b border-gray-100 flex items-center gap-1.5">
                  <span className="w-2.5 h-1 rounded-full bg-gray-600" />
                  Track Colors
                </span>
                {isEngineer ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#2563eb] shadow-2xs shrink-0" />
                      <span className="font-semibold text-blue-950">Railway Network (Blue)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#ea580c] shadow-2xs shrink-0" />
                      <span className="font-bold text-orange-950">Your Assigned Tracks (Orange)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#dc2626] shadow-2xs shrink-0" />
                      <span className="font-medium text-gray-700">Other Engineers (Red)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#16a34a] shadow-2xs shrink-0" />
                      <span className="font-medium text-gray-700">Completed (Green)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#dc2626] shadow-2xs shrink-0" />
                      <span className="font-bold text-red-950">Current / Upcoming (Red)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#16a34a] shadow-2xs shrink-0" />
                      <span className="font-medium text-gray-700">Completed (Green)</span>
                    </div>
                  </>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* 3. FLOATING INSPECTOR OVERLAY (RIGHT SIDE OF MAP)      */}
              {/* ══════════════════════════════════════════════════════ */}

              {/* ── CASE 1: ONGOING WORK SHORT DETAILS (WHEN A TRACK / BEACON IS CLICKED) ── */}
              {selectedOngoingWork && (
                <div className={`absolute right-3 top-3 bottom-3 w-84 md:w-96 flex flex-col bg-white rounded-xl shadow-2xl border ${
                  selectedOngoingWork.isFinished
                    ? "border-emerald-300"
                    : selectedOngoingWork.isOwnAssigned
                    ? "border-orange-300"
                    : "border-red-300"
                } overflow-hidden z-[1001] animate-in slide-in-from-right duration-200`}>
                  {/* Header */}
                  <div className={`p-3.5 text-white flex items-start justify-between shrink-0 ${
                    selectedOngoingWork.isFinished
                      ? "bg-emerald-700"
                      : selectedOngoingWork.isOwnAssigned
                      ? "bg-orange-600"
                      : "bg-red-700"
                  }`}>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                        {selectedOngoingWork.isFinished
                          ? "Completed Work"
                          : selectedOngoingWork.isOwnAssigned
                          ? "Your Assigned Track (In Progress)"
                          : "Active Possession in Progress"}
                      </span>
                      <h3 className="font-bold text-sm mt-1 text-white">
                        {selectedOngoingWork.trackId}
                      </h3>
                      <p className="text-[11px] text-white/80 font-medium">
                        {selectedTrack?.properties?.from_station_name || selectedTrack?.properties?.from_station} ↔ {selectedTrack?.properties?.to_station_name || selectedTrack?.properties?.to_station}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedOngoingWork(null); setSelectedTrack(null); }}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Close details"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Short Details Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                    <div className={`p-3 rounded-xl space-y-2 border ${
                      selectedOngoingWork.isFinished
                        ? "bg-emerald-50 border-emerald-200"
                        : selectedOngoingWork.isOwnAssigned
                        ? "bg-orange-50 border-orange-200"
                        : "bg-red-50 border-red-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Maintenance Task:</span>
                        <span className="font-bold text-gray-900">{selectedOngoingWork.maintenanceType}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Assigned Team:</span>
                        <span className={`font-bold ${
                          selectedOngoingWork.isFinished
                            ? "text-emerald-800"
                            : selectedOngoingWork.isOwnAssigned
                            ? "text-orange-800"
                            : "text-red-700"
                        }`}>
                          {selectedOngoingWork.team} {selectedOngoingWork.isOwnAssigned && "(You)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Allocated Time Window:</span>
                        <span className="font-bold text-gray-900 font-mono">{selectedOngoingWork.allocatedTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Scheduled Date:</span>
                        <span className="font-semibold text-gray-700">{selectedOngoingWork.allocatedDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Permit Reference:</span>
                        <span className="font-mono text-gray-600">#{selectedOngoingWork.reqId}</span>
                      </div>
                    </div>

                    {/* Site Status & Isolation Checklist */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                      <h5 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1">
                        Site Status & Protection
                      </h5>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-600">Track Clearance:</span>
                        <span className={`font-bold ${selectedOngoingWork.isFinished ? "text-emerald-700" : "text-red-700"}`}>
                          {selectedOngoingWork.isFinished ? "TRACK CLEARED & NORMAL" : "POSSESSION CLAIMED"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-600">Signals:</span>
                        <span className={`font-bold ${selectedOngoingWork.isFinished ? "text-emerald-600" : "text-red-600"}`}>
                          {selectedOngoingWork.isFinished ? "CLEARED / GREEN" : "LOCKED AT DANGER"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-600">Station Token:</span>
                        <span className="font-bold text-emerald-700">PERMIT ISSUED</span>
                      </div>
                    </div>

                    {/* Toggle Work Finished button */}
                    <button
                      type="button"
                      onClick={() => handleToggleMaintenanceFinished(selectedOngoingWork.reqId)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedOngoingWork.isFinished
                          ? "bg-slate-700 hover:bg-slate-800 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {selectedOngoingWork.isFinished ? (
                        <>
                          <RefreshCw size={13} />
                          Re-open Track Possession
                        </>
                      ) : (
                        <>
                          <CheckCheck size={15} />
                          Mark Work Completed & Clear Track
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── CASE 2: FIELD ENGINEER 2-STEP SUBMIT REQUEST DRAWER ── */}
              {isEngineer && !selectedOngoingWork && selectedTrack && (
                <div className="absolute right-3 top-3 bottom-3 w-88 md:w-112 flex flex-col bg-white rounded-xl shadow-2xl border border-gray-300 overflow-hidden z-[1001] animate-in slide-in-from-right duration-200">
                  {/* STEP 1: TRAIN SCHEDULES INSPECTION WITH ESTIMATED TIMES */}
                  {requestStep === 1 && (
                    <>
                      {/* Header */}
                      <div className="bg-[#171918] p-3.5 text-white flex items-start justify-between shrink-0">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                            <span>Step 1 of 2</span>
                            <span>•</span>
                            <span>Track Traffic Inspection</span>
                          </div>
                          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                            <Train size={15} className="text-emerald-400" />
                            <span>{selectedTrack.properties.section_id || selectedTrack.properties.track_id}</span>
                          </h3>
                          {(selectedTrack.properties.from_station || selectedTrack.properties.from_station_name) && (
                            <p className="mt-0.5 text-xs text-white/80 font-medium truncate">
                              {selectedTrack.properties.from_station_name || selectedTrack.properties.from_station} ↔ {selectedTrack.properties.to_station_name || selectedTrack.properties.to_station}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedTrack(null); setSelectedRequestTracks([]); }}
                          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Close"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Subheader Banner with Traffic Filter */}
                      {(() => {
                        const estimatedList = getEstimatedTrainsForTrack(selectedTrack, schedules);
                        const passCount = estimatedList.filter((t) => !t.isFreight).length;
                        const goodsCount = estimatedList.filter((t) => t.isFreight).length;
                        const filteredTrains = estimatedList.filter((tr) => {
                          if (trafficFilterStep1 === "PASSENGER") return !tr.isFreight;
                          if (trafficFilterStep1 === "GOODS") return tr.isFreight;
                          return true;
                        });

                        return (
                          <>
                            <div className="bg-blue-50 border-b border-blue-200 px-3.5 py-2.5 space-y-2 shrink-0">
                              <div className="flex items-center justify-between text-xs text-blue-950">
                                <span className="font-bold flex items-center gap-1.5">
                                  <Clock size={13} className="text-blue-700" />
                                  Trains Scheduled on this Track:
                                </span>
                                <span className="bg-blue-200/80 text-blue-900 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                  {filteredTrains.length} shown · {estimatedList.length} total
                                </span>
                              </div>

                              {/* Traffic Category Selector */}
                              <div className="flex items-center gap-1 rounded-lg bg-white/90 p-1 text-[11px] border border-blue-200/80">
                                <button
                                  type="button"
                                  onClick={() => setTrafficFilterStep1("ALL")}
                                  className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center ${
                                    trafficFilterStep1 === "ALL"
                                      ? "bg-[#171918] text-white shadow-xs"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  All ({estimatedList.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTrafficFilterStep1("PASSENGER")}
                                  className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 ${
                                    trafficFilterStep1 === "PASSENGER"
                                      ? "bg-blue-700 text-white shadow-xs"
                                      : "text-blue-800 hover:bg-blue-100/50"
                                  }`}
                                >
                                  <Users size={11} /> Passenger ({passCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTrafficFilterStep1("GOODS")}
                                  className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 ${
                                    trafficFilterStep1 === "GOODS"
                                      ? "bg-amber-600 text-white shadow-xs"
                                      : "text-amber-800 hover:bg-amber-100/50"
                                  }`}
                                >
                                  <Package size={11} /> Goods ({goodsCount})
                                </button>
                              </div>
                            </div>

                            {/* Scheduled Trains List with Estimated Times */}
                            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                              {loadingDetails ? (
                                <div className="p-8 text-center text-gray-500">
                                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                                  <p className="text-xs font-semibold">Loading train traffic data…</p>
                                </div>
                              ) : filteredTrains.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                  <Train size={24} className="mx-auto mb-1 text-gray-400" />
                                  <p className="text-xs font-semibold text-gray-700">No {trafficFilterStep1.toLowerCase()} trains scheduled on this section</p>
                                  <button
                                    type="button"
                                    onClick={() => setTrafficFilterStep1("ALL")}
                                    className="mt-2 text-xs font-bold text-blue-700 underline"
                                  >
                                    View all scheduled trains
                                  </button>
                                </div>
                              ) : (
                                filteredTrains.map((tr, idx) => (
                                  <div
                                    key={`${tr.trainNo || tr.train_no}-${idx}`}
                                    className={`p-3 bg-white border rounded-xl shadow-2xs transition-all text-xs space-y-1.5 ${
                                      tr.isFreight
                                        ? "border-amber-300 hover:border-amber-400 bg-linear-to-b from-white to-amber-50/20"
                                        : "border-gray-200 hover:border-blue-300"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <div>
                                        <span className={`font-mono font-extrabold mr-1.5 ${tr.isFreight ? "text-amber-950" : "text-blue-900"}`}>
                                          {tr.trainNo || tr.train_no}
                                        </span>
                                        <span className="font-bold text-gray-900">
                                          {tr.trainName || tr.train_name}
                                        </span>
                                      </div>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 flex items-center gap-1 ${
                                        tr.isFreight
                                          ? "bg-amber-100 border border-amber-300 text-amber-900"
                                          : "bg-blue-100 text-blue-800"
                                      }`}>
                                        {tr.isFreight && <Package size={10} className="text-amber-700 shrink-0" />}
                                        {tr.type || tr.train_type || "EXP"}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-gray-600 flex items-center gap-1">
                                      <span className="truncate">{tr.source || tr.source_station || "Origin"}</span>
                                      <ArrowRight size={11} className="text-gray-400 shrink-0" />
                                      <span className="truncate">{tr.destination || tr.destination_station || "Destination"}</span>
                                    </div>

                                    {/* Goods Freight Specifics */}
                                    {tr.isFreight && (
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                                        {tr.commodity && (
                                          <span className="rounded bg-slate-100 px-1.5 py-0.2 font-medium text-slate-700">
                                            📦 {tr.commodity}
                                          </span>
                                        )}
                                        {tr.locoClass && (
                                          <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 font-semibold text-amber-900">
                                            ⚡ {tr.locoClass} ({tr.traction || "25kV AC"})
                                          </span>
                                        )}
                                        {tr.grossTonnage && (
                                          <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-slate-600">
                                            {tr.grossTonnage} T · {tr.wagonCount || 58} Wagons
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Estimated Passage Window */}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[11px]">
                                      <span className="text-gray-500 font-medium flex items-center gap-1">
                                        <Clock size={11} className={tr.isFreight ? "text-amber-600" : "text-blue-600"} />
                                        Scheduled Window:
                                      </span>
                                      <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                                        tr.isFreight
                                          ? "text-amber-950 bg-amber-50 border-amber-300"
                                          : "text-emerald-800 bg-emerald-50 border-emerald-200"
                                      }`}>
                                        {tr.estimatedWindow}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {/* Step 1 Footer Action */}
                      <div className="p-3 bg-gray-50 border-t border-gray-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setRequestStep(2)}
                          className="w-full py-3 bg-[#b83825] hover:bg-[#8f2c1f] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                          <span>Next: Specify Work Details</span>
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── CASE 3: TRAFFIC OFFICER TRACK INSPECTION (NON-ENGINEERS) ── */}
              {!isEngineer && !selectedOngoingWork && selectedTrack && (
                <div className="absolute right-3 top-3 bottom-3 w-84 md:w-104 flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-300 overflow-hidden z-[1000]">
                  {/* Inspector Header */}
                  <div className="bg-[#171918] p-3.5 text-white flex items-start justify-between shrink-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Train size={16} className="text-emerald-300" />
                        <h3 className="font-bold text-sm">
                          {selectedTrack.properties.section_id || selectedTrack.properties.track_id}
                        </h3>
                        {selectedTrack.properties.distance_km && (
                          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                            {selectedTrack.properties.distance_km} km
                          </span>
                        )}
                      </div>
                      {(selectedTrack.properties.from_station || selectedTrack.properties.from_station_name) && (
                        <p className="mt-0.5 text-xs text-white/90 font-medium truncate">
                          {selectedTrack.properties.from_station_name || selectedTrack.properties.from_station} ↔ {selectedTrack.properties.to_station_name || selectedTrack.properties.to_station}
                        </p>
                      )}
                      {corridorInfo && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          <Route size={10} className="text-amber-400 shrink-0" />
                          <span>{corridorInfo.name}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setSelectedTrack(null); setSchedules([]); setCorridorInfo(null); }}
                      aria-label="Close inspector"
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* ROLE 1: FIELD ENGINEER VIEW (teams)                */}
                  {/* ────────────────────────────────────────────────── */}
                  {isEngineer ? (
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
                      {/* Big Execution Status Card */}
                      {selectedMaint ? (
                        <div className={`p-3.5 rounded-xl border shadow-xs ${
                          selectedMaint.isFinished
                            ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                            : selectedMaint.isOwnAssigned
                            ? "bg-orange-50/90 border-orange-300 text-orange-950"
                            : "bg-red-50/90 border-red-300 text-red-950"
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                selectedMaint.isFinished
                                  ? "bg-emerald-200 text-emerald-900"
                                  : selectedMaint.isOwnAssigned
                                  ? "bg-orange-200 text-orange-950"
                                  : "bg-red-200 text-red-900"
                              }`}>
                                {selectedMaint.isFinished
                                  ? "Completed Maintenance"
                                  : selectedMaint.isOwnAssigned
                                  ? "Your Assigned Track (In Progress)"
                                  : "Active Field Possession"}
                              </span>
                              <h4 className="text-base font-extrabold text-gray-900 mt-2">
                                {selectedMaint.maintenanceType}
                              </h4>
                              <p className="text-xs text-gray-600 font-medium">
                                Department: <strong>{selectedMaint.team}</strong>
                              </p>
                            </div>
                            <span className="font-mono text-[10px] text-gray-500">
                              #{selectedMaint.requestId}
                            </span>
                          </div>

                          {/* Live Remaining Countdown Timer */}
                          {!selectedMaint.isFinished && (
                            <div className="mt-3 bg-white p-3 rounded-lg border border-red-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                                  <Clock size={12} className="text-red-600 animate-pulse" /> Time Window Remaining:
                                </span>
                                <span className="text-sm font-extrabold text-red-700">
                                  {getRemainingTime(selectedMaint.request).text}
                                </span>
                              </div>
                              <div className="w-full bg-red-100 rounded-full h-2 mt-2 overflow-hidden">
                                <div
                                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${getRemainingTime(selectedMaint.request).pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                <span>Allocated: {selectedMaint.allocatedTime}</span>
                                <span>Date: {selectedMaint.allocatedDate}</span>
                              </div>
                            </div>
                          )}

                          {/* Engineer Safety & Isolation Checklist */}
                          <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                            <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 border-b pb-1">
                              <Shield size={13} className="text-emerald-600" />
                              Site Safety & OHE Clearance
                            </h5>
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">OHE 25kV Traction Power:</span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ISOLATED & GROUNDED
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Station Master Token:</span>
                                <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  PERMIT ISSUED
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Signals Status:</span>
                                <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  LOCKED AT DANGER (RED)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button for Engineer */}
                          <button
                            type="button"
                            onClick={() => handleToggleMaintenanceFinished(selectedMaint.requestId)}
                            className={`w-full mt-3 py-2.5 px-3 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              selectedMaint.isFinished
                                ? "bg-slate-700 hover:bg-slate-800 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {selectedMaint.isFinished ? (
                              <>
                                <RefreshCw size={13} />
                                Re-open Track Possession
                              </>
                            ) : (
                              <>
                                <CheckCheck size={15} />
                                Mark Work Completed & Clear Track
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-gray-500">
                          <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600" />
                          <p className="font-bold text-gray-800">Normal Active Track</p>
                          <p className="text-[11px] mt-0.5">No active possession allocated on this section.</p>
                        </div>
                      )}

                      {/* Technical Line Parameters */}
                      <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-400 block">MAX SPEED</span>
                          <span className="font-bold text-gray-800">{selectedTrack.properties.maxspeed || "110"} km/h</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">GAUGE</span>
                          <span className="font-bold text-gray-800">{selectedTrack.properties.gauge || "1676"} mm Broad Gauge</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">ELECTRIFICATION</span>
                          <span className="font-bold text-gray-800">{selectedTrack.properties.electrified || "25kV AC Contact Line"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">ACTIVE CORRIDOR</span>
                          <span className="font-bold text-blue-700 truncate block">{corridorInfo?.name || "Main Line"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ────────────────────────────────────────────────── */
                    /* ROLE 2: OPERATIONS OFFICER VIEW (officer/admin)    */
                    /* ────────────────────────────────────────────────── */
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold shrink-0">
                        {[
                          ...(selectedMaint ? [{ key: "maintenance", label: "Work", icon: Wrench }] : []),
                          { key: "trains", label: `Trains (${schedules.length})`, icon: Train },
                          { key: "conflicts", label: "Conflicts", icon: AlertTriangle },
                          { key: "ai", label: "AI Plan", icon: Shield },
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex-1 py-2 flex items-center justify-center gap-1 border-b-2 transition-colors cursor-pointer ${
                              activeTab === key
                                ? "border-[#cf432c] bg-white text-[#b83825] font-bold"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            <Icon size={12} />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Tab Content */}
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                        {loadingDetails ? (
                          <div className="py-12 text-center text-gray-400">
                            <RefreshCw className="animate-spin text-[#b83825] mx-auto mb-2" size={24} />
                            <p className="text-xs">Analyzing timetables & track conflicts…</p>
                          </div>
                        ) : (
                          <>
                            {/* TAB: WORK ALLOCATION */}
                            {activeTab === "maintenance" && selectedMaint && (
                              <div className="space-y-2.5">
                                <div className={`p-3 rounded-lg border ${
                                  selectedMaint.isFinished ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-900">{selectedMaint.maintenanceType}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      selectedMaint.isFinished ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                                    }`}>
                                      {selectedMaint.isFinished ? "Completed" : "Approved"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-600 mt-1">
                                    Team: <strong>{selectedMaint.team}</strong> · Window: <strong>{selectedMaint.allocatedTime}</strong>
                                  </p>
                                  <button
                                    onClick={() => handleToggleMaintenanceFinished(selectedMaint.requestId)}
                                    className="mt-2.5 w-full py-1.5 px-2.5 rounded bg-[#171918] hover:bg-black text-white text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    {selectedMaint.isFinished ? "Reopen Possession" : "Mark Completed on Live Map"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* TAB: TRAINS */}
                            {activeTab === "trains" && (
                              <div className="space-y-2.5">
                                {(() => {
                                  const trackId = selectedTrack?.properties?.track_id || selectedTrack?.properties?.section_id;
                                  let fullList = [...schedules];
                                  const hasFreight = fullList.some((s) => isFreightTrain(s) || s.type === "GOODS");
                                  if (!hasFreight && trackId) {
                                    const frList = getScheduledFreightForTrack(trackId);
                                    fullList = [...fullList, ...frList];
                                  }

                                  const passCount = fullList.filter((s) => !isFreightTrain(s) && s.type !== "GOODS").length;
                                  const goodsCount = fullList.filter((s) => isFreightTrain(s) || s.type === "GOODS").length;
                                  const displayed = fullList.filter((s) => {
                                    const isFr = isFreightTrain(s) || s.type === "GOODS";
                                    if (trafficFilterDock === "PASSENGER") return !isFr;
                                    if (trafficFilterDock === "GOODS") return isFr;
                                    return true;
                                  });

                                  return (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-700">Official Scheduled Services</span>
                                        <span className="text-[10px] text-gray-500 font-medium">{displayed.length} shown · {fullList.length} total</span>
                                      </div>

                                      {/* Traffic Category Filter */}
                                      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 text-[10px]">
                                        <button
                                          type="button"
                                          onClick={() => setTrafficFilterDock("ALL")}
                                          className={`flex-1 py-1 px-1 rounded font-bold transition-all text-center ${
                                            trafficFilterDock === "ALL" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                                          }`}
                                        >
                                          All ({fullList.length})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setTrafficFilterDock("PASSENGER")}
                                          className={`flex-1 py-1 px-1 rounded font-bold transition-all text-center flex items-center justify-center gap-0.5 ${
                                            trafficFilterDock === "PASSENGER" ? "bg-blue-600 text-white shadow-2xs" : "text-blue-800 hover:text-blue-900"
                                          }`}
                                        >
                                          <Users size={10} /> Passenger ({passCount})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setTrafficFilterDock("GOODS")}
                                          className={`flex-1 py-1 px-1 rounded font-bold transition-all text-center flex items-center justify-center gap-0.5 ${
                                            trafficFilterDock === "GOODS" ? "bg-amber-600 text-white shadow-2xs" : "text-amber-800 hover:text-amber-900"
                                          }`}
                                        >
                                          <Package size={10} /> Goods ({goodsCount})
                                        </button>
                                      </div>

                                      {/* Day filter */}
                                      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                                        {["ALL", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                                          <button
                                            key={d}
                                            onClick={() => handleDayChange(d)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                              selectedDay === d
                                                ? "bg-[#171918] text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                          >
                                            {d}
                                          </button>
                                        ))}
                                      </div>

                                      {displayed.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg border">
                                          <Train size={24} className="mx-auto mb-1 text-gray-300" />
                                          <p>No {trafficFilterDock.toLowerCase()} movements in this window</p>
                                        </div>
                                      ) : (
                                        displayed.map((s, idx) => {
                                          const isFr = isFreightTrain(s) || s.type === "GOODS";
                                          return (
                                            <div
                                              key={`${s.trainNo || s.train_no}-${idx}`}
                                              className={`p-2.5 bg-white border rounded-lg shadow-2xs space-y-1 ${
                                                isFr ? "border-amber-200 bg-amber-50/20" : "border-gray-200"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1">
                                                <div>
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`font-mono font-bold ${isFr ? "text-amber-900" : "text-blue-900"}`}>
                                                      {s.trainNo || s.train_no}
                                                    </span>
                                                    <span className="font-bold text-gray-900">{s.trainName || s.train_name}</span>
                                                    {isFr && (
                                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300 text-amber-900 flex items-center gap-0.5">
                                                        <Package size={9} /> {s.rakeType || "GOODS"}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                                    {s.source} ➔ {s.destination}
                                                    {isFr && s.commodity && ` · ${s.commodity}`}
                                                  </div>
                                                </div>
                                                <span className={`font-mono text-[11px] font-bold shrink-0 ${isFr ? "text-amber-900" : "text-blue-700"}`}>
                                                  {s.arrival || s.arr || "--"} - {s.departure || s.dep || "--"}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {/* TAB: CONFLICTS */}
                            {activeTab === "conflicts" && (
                              <div className="space-y-2.5">
                                {conflictData && !conflictData.safe ? (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                                    <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
                                      <AlertTriangle size={14} />
                                      <span>Conflict Detected in Block Window</span>
                                    </div>
                                    <p className="text-[11px] text-red-700">
                                      The following train schedules overlap with the designated maintenance window:
                                    </p>
                                    {conflictData.conflicts?.map((c) => (
                                      <div key={c.trainNo} className="bg-white p-2 rounded border border-red-200 text-[11px]">
                                        <p className="font-bold text-gray-900">{c.trainName} ({c.trainNo})</p>
                                        <p className="text-gray-600">Track Occupancy: {c.arrival} → {c.departure}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                                    <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                                    <div>
                                      <p className="font-bold text-green-900">Clear Maintenance Corridor</p>
                                      <p className="text-[11px] text-green-700">Zero active train overlaps in the designated maintenance window.</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* TAB: AI PLAN */}
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
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-[10px] text-blue-700 font-semibold uppercase">MCDA Priority Score</p>
                                      <p className="text-2xl font-extrabold text-blue-950">{agentPlan.priorityScore}/100</p>
                                    </div>
                                    <Shield size={28} className="text-blue-500 opacity-60" />
                                  </div>
                                  <p className="text-[11px] text-blue-900 mt-1">{agentPlan.explanation}</p>
                                </div>

                                {validAgentAlternatives.map((alt) => {
                                  const isDiversion = alt.type === "REROUTE" || alt.type === "DIVERSION";
                                  const passivity = evaluateDiversionPassivity(alt, { conflictingTrains: conflictData?.conflicts || schedules }, conflictData?.conflicts || []);
                                  const isPassive = isDiversion && passivity.isPassive;
                                  const displayType = isDiversion ? "DIVERSION" : alt.type;

                                  return (
                                    <div key={alt.id} className={`border rounded-lg p-2.5 text-xs space-y-1 ${isPassive ? "bg-amber-50/30 border-amber-200" : "bg-white"}`}>
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                          #{alt.rank}: {displayType}
                                          {isPassive && (
                                            <span className="bg-rose-100 border border-rose-300 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                              PASSIVE · NO OHE
                                            </span>
                                          )}
                                        </span>
                                        {alt.rank === 1 && !isPassive && (
                                          <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                                            BEST CHOICE
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-gray-600">{alt.description?.replace(/reroute/gi, "diversion")}</p>
                                      {isPassive && (
                                        <div className="mt-1 p-2 rounded bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-1.5">
                                          <AlertTriangle size={13} className="text-amber-700 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="font-bold text-amber-950">Electric Train Alert:</span>
                                            <p className="text-[10px] text-amber-800 mt-0.5">{passivity.reason}</p>
                                          </div>
                                        </div>
                                      )}
                                      {isDiversion && alt.routeGeometry?.coordinates?.length > 1 && (
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
                                          className="mt-1.5 w-full py-1.5 rounded bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-950 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <MapPin size={13} />
                                          {detourRoute ? "Hide Diversion from Map" : "Show Diversion on Map"}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CASE B: TRAIN JOURNEY & ROUTE INSPECTOR ── */}
              {!selectedTrack && selectedTrainRoute && (
                <div className="absolute right-3 top-3 bottom-3 w-84 md:w-104 flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-300 overflow-hidden z-[1000]">
                  {/* Header */}
                  <div className="bg-[#171918] p-3.5 text-white flex items-start justify-between shrink-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Train size={16} className="text-blue-400" />
                        <h3 className="font-bold text-sm">
                          {selectedTrainRoute.train_no} · {selectedTrainRoute.train_name}
                        </h3>
                        <span className="text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded">
                          {selectedTrainRoute.train_type || selectedTrainRoute.type || "EXPRESS"}
                        </span>
                        {selectedTrainRoute.zone && (
                          <span className="text-[9px] font-bold uppercase bg-gray-500/20 text-gray-300 border border-gray-400/30 px-1.5 py-0.5 rounded">
                            {selectedTrainRoute.zone}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-300 font-medium flex-wrap">
                        <span>{selectedTrainRoute.source_station_name || selectedTrainRoute.source_station || "Origin"}</span>
                        <ArrowRight size={11} className="text-gray-400" />
                        <span>{selectedTrainRoute.destination_station_name || selectedTrainRoute.destination_station || "Destination"}</span>
                        <span>·</span>
                        <span>{selectedTrainRoute.distance_km || 0} km</span>
                        <span>·</span>
                        <span>{selectedTrainRoute.stops?.length || 0} stops</span>
                      </div>
                    </div>
                    <button
                      onClick={handleClearTrainRoute}
                      aria-label="Close train inspector"
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
                    {/* Official Timetable Metadata Strip */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">DEPARTURE</span>
                        <span className="font-bold text-gray-800">
                          {selectedTrainRoute.departure_time ? selectedTrainRoute.departure_time.slice(0, 5) : "--"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">ARRIVAL</span>
                        <span className="font-bold text-gray-800">
                          {selectedTrainRoute.arrival_time ? selectedTrainRoute.arrival_time.slice(0, 5) : "--"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">TOTAL DURATION</span>
                        <span className="font-bold text-blue-700">
                          {selectedTrainRoute.duration_hours ? `${selectedTrainRoute.duration_hours}h ${selectedTrainRoute.duration_minutes || 0}m` : "--"}
                        </span>
                      </div>
                    </div>
                    {/* Official Timetable & Journey Summary Card */}
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                            Official Indian Railways Route
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          {selectedTrainRoute.running_days || "Daily"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-gray-400 block font-semibold">TOTAL ROUTE</span>
                          <span className="font-bold text-sm text-gray-900">{selectedTrainRoute.distance_km || 0} km</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-gray-400 block font-semibold">SCHEDULED STOPS</span>
                          <span className="font-bold text-sm text-blue-700">{selectedTrainRoute.stops?.length || 0} Stations</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2">
                          <span className="text-[10px] text-gray-400 block font-semibold">OPERATING CORRIDOR</span>
                          <span className="text-xs font-semibold text-gray-800 truncate block">
                            {selectedTrainRoute.source_station_name || selectedTrainRoute.source_station} ➔ {selectedTrainRoute.destination_station_name || selectedTrainRoute.destination_station}
                          </span>
                        </div>
                      </div>

                      {selectedTrainRoute.classes && (
                        <div className="text-[10px] text-gray-500 pt-1 flex items-center gap-1.5 border-t border-slate-100">
                          <span className="font-semibold text-gray-700">Classes:</span>
                          <span className="font-mono">{selectedTrainRoute.classes}</span>
                        </div>
                      )}
                    </div>

                    {/* Sequence Timeline */}
                    <div>
                      <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1">
                        <Navigation size={12} className="text-blue-600" />
                        Station Sequence & Halts ({selectedTrainRoute.stops?.length || 0})
                      </h4>
                      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                        {(selectedTrainRoute.stops || []).map((stop, idx) => (
                          <div key={`${stop.station_code}-${idx}`} className="p-2 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="truncate">
                                <p className="font-bold text-gray-900 truncate">
                                  {stop.station_name || stop.station_code}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {stop.distance_from_source_km != null ? `${stop.distance_from_source_km} km` : "--"}
                                  {stop.halt_minutes > 0 ? ` · Halt: ${stop.halt_minutes}m` : ""}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] text-blue-700 font-semibold shrink-0 ml-2">
                              {stop.arrival_time || stop.departure_time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
