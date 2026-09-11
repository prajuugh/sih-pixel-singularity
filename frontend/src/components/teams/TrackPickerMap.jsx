// frontend/src/components/teams/TrackPickerMap.jsx
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { MapPin, Search, CheckCircle2, X, Train, RefreshCw, Compass, Plus } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Pans smoothly to a target track (only when explicitly searched or hub clicked) WITHOUT zooming out
function MapPanController({ panTarget }) {
  const map = useMap();
  useEffect(() => {
    if (!panTarget || !panTarget.coords) return;
    const coords = panTarget.coords;
    if (!coords || coords.length === 0) return;

    try {
      const midIdx = Math.floor(coords.length / 2);
      const center = [coords[midIdx][1], coords[midIdx][0]];
      // Keep current zoom if already zoomed in, or zoom in to at least 14 — NEVER zoom out!
      const currentZoom = map.getZoom();
      const targetZoom = Math.max(currentZoom, 14);
      map.setView(center, targetZoom, { animate: true });
    } catch (e) {
      console.warn("Could not pan to track:", e);
    }
  }, [panTarget, map]);

  return null;
}

// Quick presets for major Karnataka railway junctions
const QUICK_HUBS = [
  { label: "Hubballi", trackId: "KA-T-000342" },
  { label: "Bengaluru", trackId: "KA-T-000120" },
  { label: "Mysuru", trackId: "KA-T-000280" },
  { label: "Ballari", trackId: "KA-T-000450" },
];

export default function TrackPickerMap({ selectedTrackIds = [], onToggleTrack, onClearAll }) {
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMsg, setSearchMsg] = useState("");
  const [panTarget, setPanTarget] = useState(null);
  const geoJsonRef = useRef(null);

  // Fetch track GeoJSON from backend
  useEffect(() => {
    let isMounted = true;
    fetch(`${BASE_URL}/tracks`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load tracks");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setTracks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading tracks for picker:", err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick lookup set for fast styling
  const selectedSet = useMemo(() => new Set(selectedTrackIds.map((id) => id.toUpperCase())), [selectedTrackIds]);

  // Re-style map layers whenever selectedTrackIds changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer((l) => {
        const tid = l.feature?.properties?.track_id?.toUpperCase();
        const isSelected = tid && selectedSet.has(tid);
        l.setStyle({
          color: isSelected ? "#059669" : "#2563eb",
          weight: isSelected ? 7 : 3,
          opacity: isSelected ? 1 : 0.7,
        });
      });
    }
  }, [selectedSet]);

  // Toggle track selection (from map click: never changes zoom or camera)
  const handleToggle = (trackId, feature) => {
    if (!trackId) return;
    const normId = trackId.toUpperCase();
    onToggleTrack?.(normId, feature);
    setSearchMsg("");
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim() || !tracks?.features) return;
    const q = searchQuery.trim().toUpperCase();
    const found = tracks.features.find((f) =>
      f.properties?.track_id?.toUpperCase().includes(q)
    );
    if (found) {
      const tid = found.properties.track_id;
      // Pan to the track without zooming out
      if (found.geometry?.coordinates) {
        setPanTarget({ coords: found.geometry.coordinates, trackId: tid });
      }
      if (!selectedSet.has(tid.toUpperCase())) {
        handleToggle(tid, found);
        setSearchMsg(`Added segment ${tid} to selection`);
      } else {
        setSearchMsg(`Segment ${tid} is already selected`);
      }
    } else {
      setSearchMsg(`Track "${searchQuery}" not found. Select from the map directly.`);
    }
  };

  const trackStyle = (feature) => {
    const tid = feature?.properties?.track_id?.toUpperCase();
    const isSelected = tid && selectedSet.has(tid);
    return {
      color: isSelected ? "#059669" : "#2563eb",
      weight: isSelected ? 7 : 3,
      opacity: isSelected ? 1 : 0.7,
    };
  };

  const onEachTrack = (feature, layer) => {
    const tid = feature.properties?.track_id || "Track";
    layer.bindTooltip(`<strong>${tid}</strong><br/>Click to toggle selection`, {
      sticky: true,
      className: "track-tooltip",
    });

    layer.on({
      click: () => handleToggle(tid, feature),
      mouseover: (e) => {
        const isSelected = selectedSet.has(tid.toUpperCase());
        if (!isSelected) {
          e.target.setStyle({ weight: 5, color: "#10b981", opacity: 0.9 });
        }
      },
      mouseout: (e) => {
        const isSelected = selectedSet.has(tid.toUpperCase());
        e.target.setStyle({
          color: isSelected ? "#059669" : "#2563eb",
          weight: isSelected ? 7 : 3,
          opacity: isSelected ? 1 : 0.7,
        });
      },
    });
  };

  return (
    <div className="space-y-3">
      {/* Top Search & Presets Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Track ID (e.g. KA-T-000342)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchSubmit(); } }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="px-3 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-900 transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>

        {/* Quick Hub Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          <span className="text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
            <Compass size={12} /> Hubs:
          </span>
          {QUICK_HUBS.map((hub) => {
            const isSelected = selectedSet.has(hub.trackId.toUpperCase());
            return (
              <button
                key={hub.trackId}
                type="button"
                onClick={() => {
                  const found = tracks?.features?.find(
                    (f) => f.properties?.track_id === hub.trackId
                  );
                  if (found?.geometry?.coordinates) {
                    setPanTarget({ coords: found.geometry.coordinates, trackId: hub.trackId });
                  }
                  handleToggle(hub.trackId, found);
                }}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? "bg-green-800 text-white font-semibold shadow-xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {isSelected ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                {hub.label}
              </button>
            );
          })}
        </div>
      </div>

      {searchMsg && (
        <p className={`text-xs ${searchMsg.includes("Added") ? "text-green-700 font-medium" : "text-amber-700"}`}>
          {searchMsg}
        </p>
      )}

      {/* Embedded Map Container */}
      <div className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden shadow-inner bg-slate-50">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-500">
            <RefreshCw size={24} className="animate-spin text-green-800" />
            <span className="text-xs font-medium">Loading 5,461 Karnataka railway track segments...</span>
          </div>
        ) : (
          <div className="h-72 w-full">
            <MapContainer
              center={[15.3173, 75.7139]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {tracks && (
                <GeoJSON
                  ref={geoJsonRef}
                  data={tracks}
                  style={trackStyle}
                  onEachFeature={onEachTrack}
                />
              )}

              {panTarget && <MapPanController panTarget={panTarget} />}
            </MapContainer>
          </div>
        )}

        {/* Floating Instructions Helper */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] text-gray-600 shadow-sm border border-gray-200 flex items-center gap-1.5 pointer-events-none">
          <MapPin size={12} className="text-green-800" />
          <span>Click multiple blue track lines to add/remove them from block possession</span>
        </div>
      </div>

      {/* Selected Track Segments Multi-Badge Card */}
      {selectedTrackIds.length > 0 ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-emerald-900 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                {selectedTrackIds.length}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {selectedTrackIds.length === 1 ? "1 Track Segment Selected" : `${selectedTrackIds.length} Track Segments Selected`}
              </span>
            </div>

            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {/* List of segment chips */}
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {selectedTrackIds.map((tid) => (
              <span
                key={tid}
                className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900 shadow-2xs"
              >
                <Train size={12} className="text-emerald-700" />
                {tid}
                <button
                  type="button"
                  onClick={() => handleToggle(tid, null)}
                  className="text-gray-400 hover:text-red-600 ml-1 rounded-full p-0.5 transition-colors cursor-pointer"
                  title={`Remove ${tid}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <p className="text-[11px] text-emerald-700">
            All {selectedTrackIds.length} segments will be included in the unified multi-track block sanction.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <MapPin size={14} className="shrink-0" />
          <span>No track segments selected yet. Click one or more tracks on the map to add them to your request.</span>
        </div>
      )}
    </div>
  );
}
