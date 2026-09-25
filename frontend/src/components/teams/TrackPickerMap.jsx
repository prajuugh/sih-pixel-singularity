// frontend/src/components/teams/TrackPickerMap.jsx
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import {
  Search,
  CheckCircle2,
  X,
  Train,
  RefreshCw,
  Compass,
  Plus,
  ArrowRight,
} from "lucide-react";
import { fetchTracks } from "../../utils/api";

function MapLifecycle({ active, panTarget }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => map.invalidateSize());
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [active, map]);

  useEffect(() => {
    if (!panTarget?.coords?.length) return;
    try {
      const coords = panTarget.coords;
      const midIdx = Math.floor(coords.length / 2);
      const center = [coords[midIdx][1], coords[midIdx][0]];
      const targetZoom = Math.max(map.getZoom(), 14);
      map.setView(center, targetZoom, { animate: true });
    } catch (e) {
      console.warn("Could not pan to track:", e);
    }
  }, [panTarget, map]);

  return null;
}

const QUICK_HUBS = [
  { label: "New Delhi (NDLS)", trackId: "SEC-CSB-NDLS" },
  { label: "Mumbai (BCT)", trackId: "SEC-BCT-MX" },
  { label: "Howrah (HWH)", trackId: "SEC-HWHG-HWH" },
  { label: "Chennai (MAS)", trackId: "SEC-BBQ-MAS" },
  { label: "Bengaluru (SBC)", trackId: "SEC-BNC-SBC" },
  { label: "Hyderabad (SC)", trackId: "SEC-JET-SC" },
  { label: "Ahmedabad (ADI)", trackId: "SEC-ADI-MAN" },
  { label: "Hubballi (UBL)", trackId: "SEC-UBL-HBQ" },
];

export default function TrackPickerMap({
  selectedTrackIds = [],
  onToggleTrack,
  onClearAll,
  onContinue,
  continueError,
  active = true,
}) {
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMsg, setSearchMsg] = useState("");
  const [panTarget, setPanTarget] = useState(null);
  const geoJsonRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    fetchTracks()
      .then((data) => {
        if (!isMounted) return;
        setTracks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading tracks for picker:", err);
        if (isMounted) {
          setTracks(null);
          setLoadError("Railway tracks could not be loaded.");
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (active) searchRef.current?.focus();
  }, [active]);

  const selectedSet = useMemo(
    () => new Set(selectedTrackIds.map((id) => id.toUpperCase())),
    [selectedTrackIds]
  );
  const selectedCount = selectedTrackIds.length;

  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer((l) => {
      const tid = l.feature?.properties?.track_id?.toUpperCase();
      const isSelected = tid && selectedSet.has(tid);
      l.setStyle({
        color: isSelected ? "#059669" : "#2563eb",
        weight: isSelected ? 7 : 3,
        opacity: isSelected ? 1 : 0.7,
      });
    });
  }, [selectedSet]);

  const handleToggle = (trackId, feature) => {
    if (!trackId) return;
    onToggleTrack?.(trackId.toUpperCase(), feature);
    setSearchMsg("");
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim() || !tracks?.features) return;
    const q = searchQuery.trim().toUpperCase();
    const found = tracks.features.find((f) => {
      const p = f.properties || {};
      return (
        p.track_id?.toUpperCase().includes(q) ||
        p.section_id?.toUpperCase().includes(q) ||
        p.from_station?.toUpperCase() === q ||
        p.to_station?.toUpperCase() === q ||
        p.from_station_name?.toUpperCase().includes(q) ||
        p.to_station_name?.toUpperCase().includes(q)
      );
    });
    if (found) {
      const tid = found.properties.track_id || found.properties.section_id;
      if (found.geometry?.coordinates) {
        setPanTarget({ coords: found.geometry.coordinates, trackId: tid });
      }
      if (!selectedSet.has(tid.toUpperCase())) {
        handleToggle(tid, found);
        setSearchMsg(`Added ${tid}`);
      } else {
        setSearchMsg(`${tid} is already in possession`);
      }
    } else {
      setSearchMsg(`Track or station “${searchQuery}” not found. Click a line on the map.`);
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
    layer.bindTooltip(`<strong>${tid}</strong><br/>Click to add or remove`, {
      sticky: true,
      className: "track-tooltip",
    });

    layer.on({
      click: () => handleToggle(tid, feature),
      mouseover: (e) => {
        if (!selectedSet.has(tid.toUpperCase())) {
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
    <div className="absolute inset-0 bg-slate-950">
      {loading ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
          <RefreshCw size={28} className="animate-spin text-emerald-400" />
          <p className="text-sm font-medium tracking-wide">
            Loading India railway segments…
          </p>
        </div>
      ) : loadError ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#f4f6f5] px-6 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-red-50 text-[#cf432c]">
            <Train size={22} />
          </div>
          <div>
            <p className="font-semibold text-slate-950">Track layer unavailable</p>
            <p className="mt-1 text-sm text-slate-500">The base map is ready, but the railway data did not load.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError("");
              setLoadAttempt((attempt) => attempt + 1);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#171918] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            <RefreshCw size={16} /> Retry track layer
          </button>
        </div>
      ) : (
        <div className="absolute inset-0">
          <MapContainer
            center={[22.5, 79.5]}
            zoom={5}
            minZoom={4}
            zoomControl={false}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
            className="[&_.leaflet-bottom]:!bottom-36"
            scrollWheelZoom={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ZoomControl position="bottomright" />
            {tracks?.features?.length > 0 && (
              <GeoJSON
                ref={geoJsonRef}
                data={tracks}
                style={trackStyle}
                onEachFeature={onEachTrack}
              />
            )}
            <MapLifecycle active={active} panTarget={panTarget} />
          </MapContainer>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-[1100] flex flex-col justify-between p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="pointer-events-auto max-w-xl rounded-2xl bg-white/92 px-4 py-3 shadow-[0_12px_40px_rgb(15_23_42/0.18)] ring-1 ring-black/8 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b83825]">
              Step 1 of 2 · Claim the corridor
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Which tracks leave traffic?
            </h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600">
              Click every segment that must be taken out of service. The map is the request — details come next.
            </p>
          </div>

          <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-2 lg:max-w-xl lg:items-end">
            <div className="flex w-full gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  aria-label="Search track ID"
                  placeholder="Jump to a track ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  className="w-full rounded-xl border-0 bg-white/92 py-2.5 pr-3 pl-9 text-sm text-slate-900 shadow-[0_12px_40px_rgb(15_23_42/0.18)] ring-1 ring-black/8 backdrop-blur-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cf432c]"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="rounded-xl bg-[#171918] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(20_83_45/0.28)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black active:scale-[0.96]"
              >
                Add
              </button>
            </div>
            <div className="flex w-full flex-wrap items-center gap-1.5 lg:justify-end">
              <span className="flex items-center gap-1 text-[11px] font-medium text-white/90 drop-shadow-sm">
                <Compass size={12} /> Jump
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
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ${
                      isSelected
                        ? "bg-[#171918] font-semibold text-white shadow-xs"
                        : "bg-white/92 text-slate-700 ring-1 ring-black/8 backdrop-blur-md hover:bg-white"
                    }`}
                  >
                    {isSelected ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                    {hub.label}
                  </button>
                );
              })}
            </div>
            {searchMsg && (
              <p
                className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium lg:text-right ${
                  searchMsg.startsWith("Added")
                    ? "bg-emerald-950/80 text-emerald-100"
                    : "bg-amber-950/80 text-amber-100"
                }`}
              >
                {searchMsg}
              </p>
            )}
          </div>
        </div>

        <div className="pointer-events-auto mx-auto w-full max-w-5xl">
          <div
            className={`rounded-2xl p-3 shadow-[0_16px_48px_rgb(15_23_42/0.28)] ring-1 backdrop-blur-md sm:p-4 ${
              selectedCount
                ? "bg-white/94 ring-emerald-700/20"
                : "bg-slate-950/82 ring-white/10"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                      selectedCount
                        ? "bg-[#171918] text-white"
                        : "bg-white/15 text-white"
                    }`}
                    aria-live="polite"
                  >
                    {selectedCount}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        selectedCount ? "text-slate-950" : "text-white"
                      }`}
                    >
                      {selectedCount === 0
                        ? "No corridor claimed yet"
                        : selectedCount === 1
                          ? "1 segment in possession"
                          : `${selectedCount} segments in possession`}
                    </p>
                    <p className={`text-[10px] ${selectedCount ? "text-slate-400" : "text-white/45"}`}>
                      Map data © OpenStreetMap
                    </p>
                    <p
                      className={`text-xs ${
                        selectedCount ? "text-slate-500" : "text-white/70"
                      }`}
                    >
                      {selectedCount
                        ? "These lines become one unified block sanction."
                        : "Click a blue track. Click again to release it."}
                    </p>
                  </div>
                </div>

                {selectedCount > 0 && (
                  <div className="mt-2.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {selectedTrackIds.map((tid) => (
                      <span
                        key={tid}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 font-mono text-xs font-bold text-emerald-900"
                      >
                        <Train size={12} className="text-emerald-700" />
                        {tid}
                        <button
                          type="button"
                          onClick={() => handleToggle(tid, null)}
                          aria-label={`Remove ${tid}`}
                          className="ml-0.5 inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-[color,background-color,transform] duration-150 hover:bg-red-50 hover:text-red-600 active:scale-[0.96]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                {continueError && (
                  <p className="text-xs font-medium text-red-300">{continueError}</p>
                )}
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={selectedCount === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171918] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(20_83_45/0.32)] transition-[background-color,transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  Next · specify the work
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
