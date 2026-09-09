import { useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";


// ========================================
// MAP CONTROLLER
// ========================================

function MapController({ selectedTrack }) {

    const map = useMap();

    useEffect(() => {

        if (!selectedTrack) {
            return;
        }

        const coordinates =
            selectedTrack.geometry.coordinates;

        if (!coordinates || coordinates.length === 0) {
            return;
        }

        const latLngs = coordinates.map(
            coordinate => [
                coordinate[1],
                coordinate[0]
            ]
        );

        map.fitBounds(latLngs, {
            padding: [50, 50]
        });

    }, [selectedTrack, map]);

    return null;
}


// ========================================
// RAILWAY MAP
// ========================================

function RailwayMap() {

    const [tracks, setTracks] = useState(null);

    const [selectedTrack, setSelectedTrack] =
        useState(null);

    const [schedules, setSchedules] =
        useState([]);

    const [searchId, setSearchId] =
        useState("");


    const geoJsonRef = useRef(null);


    // ========================================
    // LOAD ALL TRACKS
    // ========================================

    useEffect(() => {

        fetch("http://localhost:3000/api/tracks")

            .then(response => {

                if (!response.ok) {
                    throw new Error(
                        "Failed to load tracks"
                    );
                }

                return response.json();

            })

            .then(data => {

                console.log(
                    "Tracks loaded:",
                    data.features.length
                );

                setTracks(data);

            })

            .catch(error => {

                console.error(
                    "Error loading tracks:",
                    error
                );

            });

    }, []);


    // ========================================
    // TRACK STYLES
    // ========================================

    const trackStyle = {
        color: "blue",
        weight: 3,
        opacity: 0.8
    };


    const selectedTrackStyle = {
        color: "red",
        weight: 7,
        opacity: 1
    };


    // ========================================
    // LOAD SCHEDULE
    // ========================================

    const loadSchedule = (trackId) => {

        fetch(
            `http://localhost:3000/api/tracks/${trackId}/schedule`
        )

            .then(response => {

                if (!response.ok) {
                    throw new Error(
                        "Failed to load schedule"
                    );
                }

                return response.json();

            })

            .then(data => {

                console.log(
                    "Schedule:",
                    data
                );

                setSchedules(
                    data.schedules
                );

            })

            .catch(error => {

                console.error(
                    "Error loading schedule:",
                    error
                );

                setSchedules([]);

            });

    };


    // ========================================
    // SELECT TRACK
    // ========================================

    const selectTrack = (feature) => {

        const trackId =
            feature.properties.track_id;

        console.log(
            "Selected track:",
            trackId
        );

        setSelectedTrack(feature);

        loadSchedule(trackId);

    };


    // ========================================
    // TRACK CLICK / HOVER
    // ========================================

    const onEachTrack = (feature, layer) => {

        const trackId =
            feature.properties.track_id;


        layer.bindTooltip(trackId);


        layer.on({

            click: () => {

                selectTrack(feature);

            },


            mouseover: () => {

                layer.setStyle({
                    weight: 6
                });

            },


            mouseout: () => {

                if (
                    selectedTrack &&
                    selectedTrack.properties.track_id ===
                    trackId
                ) {

                    layer.setStyle(
                        selectedTrackStyle
                    );

                } else {

                    layer.setStyle(
                        trackStyle
                    );

                }

            }

        });

    };


    // ========================================
    // SEARCH TRACK
    // ========================================

    const searchTrack = () => {

        if (!tracks) {
            return;
        }


        const id =
            searchId.trim().toUpperCase();


        if (!id) {
            return;
        }


        const feature =
            tracks.features.find(
                feature =>
                    feature.properties.track_id
                        .toUpperCase() === id
            );


        if (!feature) {

            alert(
                `Track ${id} not found`
            );

            return;

        }


        selectTrack(feature);


        // Highlight selected track
        if (geoJsonRef.current) {

            geoJsonRef.current.eachLayer(
                layer => {

                    const layerTrackId =
                        layer.feature
                            ?.properties
                            ?.track_id;


                    if (
                        layerTrackId === id
                    ) {

                        layer.setStyle(
                            selectedTrackStyle
                        );

                    } else {

                        layer.setStyle(
                            trackStyle
                        );

                    }

                }
            );

        }

    };


    // ========================================
    // ENTER KEY
    // ========================================

    const handleKeyDown = (event) => {

        if (event.key === "Enter") {

            searchTrack();

        }

    };


    // ========================================
    // COMPONENT UI
    // ========================================

    return (

        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative"
            }}
        >

            {/* ================================
                SEARCH BOX
            ================================= */}

            <div
                style={{
                    position: "absolute",

                    top: "20px",
                    left: "60px",

                    zIndex: 1000,

                    background: "white",

                    padding: "10px",

                    borderRadius: "8px",

                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.3)"
                }}
            >

                <input
                    type="text"
                    placeholder="Enter Track ID"

                    value={searchId}

                    onChange={
                        event =>
                            setSearchId(
                                event.target.value
                            )
                    }

                    onKeyDown={
                        handleKeyDown
                    }

                    style={{
                        width: "180px",

                        padding: "8px",

                        border:
                            "1px solid #ccc",

                        borderRadius: "5px",

                        marginRight: "5px"
                    }}
                />


                <button
                    onClick={searchTrack}

                    style={{
                        padding:
                            "8px 12px",

                        border: "none",

                        borderRadius: "5px",

                        cursor: "pointer"
                    }}
                >

                    Search

                </button>

            </div>


            {/* ================================
                MAP
            ================================= */}

            <MapContainer

                center={[
                    15.3173,
                    75.7139
                ]}

                zoom={7}

                minZoom={6}

                style={{
                    width: "100%",
                    height: "100%"
                }}

            >

                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"

                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />


                {tracks && (

                    <GeoJSON

                        ref={geoJsonRef}

                        data={tracks}

                        style={feature => {

                            if (
                                selectedTrack &&
                                feature.properties.track_id ===
                                selectedTrack.properties.track_id
                            ) {

                                return selectedTrackStyle;

                            }

                            return trackStyle;

                        }}

                        onEachFeature={
                            onEachTrack
                        }

                    />

                )}


                <MapController
                    selectedTrack={
                        selectedTrack
                    }
                />

            </MapContainer>


            {/* ================================
                TRACK INFORMATION
            ================================= */}

            {selectedTrack && (

                <div
                    style={{
                        position: "absolute",

                        top: "80px",
                        right: "20px",

                        width: "320px",

                        maxHeight: "80vh",

                        overflowY: "auto",

                        background: "white",

                        padding: "20px",

                        borderRadius: "10px",

                        boxShadow:
                            "0 2px 10px rgba(0,0,0,0.3)",

                        zIndex: 1000
                    }}
                >

                    <h2>
                        Selected Track
                    </h2>


                    <p>

                        <strong>
                            Track ID:
                        </strong>{" "}

                        {
                            selectedTrack
                                .properties
                                .track_id
                        }

                    </p>


                    <p>

                        <strong>
                            OSM ID:
                        </strong>{" "}

                        {
                            selectedTrack
                                .properties
                                .osm_id
                        }

                    </p>


                    <p>

                        <strong>
                            Railway:
                        </strong>{" "}

                        {
                            selectedTrack
                                .properties
                                .railway
                        }

                    </p>


                    <hr />


                    {/* ============================
                        TRAIN SCHEDULE
                    ============================= */}

                    <h3>
                        Train Schedule
                    </h3>


                    {schedules.length === 0 ? (

                        <p>
                            No trains scheduled
                            for this track.
                        </p>

                    ) : (

                        schedules.map(
                            schedule => (

                                <div
                                    key={
                                        schedule.trainNo
                                    }

                                    style={{
                                        marginBottom:
                                            "15px",

                                        padding:
                                            "12px",

                                        background:
                                            "#f3f3f3",

                                        borderRadius:
                                            "6px"
                                    }}
                                >

                                    <strong>

                                        🚆{" "}

                                        {
                                            schedule.trainNo
                                        }

                                        {" - "}

                                        {
                                            schedule.trainName
                                        }

                                    </strong>


                                    <p
                                        style={{
                                            margin:
                                                "8px 0"
                                        }}
                                    >

                                        <strong>
                                            Route:
                                        </strong>{" "}

                                        {
                                            schedule.source
                                        }

                                        {" → "}

                                        {
                                            schedule.destination
                                        }

                                    </p>


                                    <p
                                        style={{
                                            margin:
                                                "8px 0"
                                        }}
                                    >

                                        <strong>
                                            Arrival:
                                        </strong>{" "}

                                        {
                                            schedule.arrival
                                        }

                                    </p>


                                    <p
                                        style={{
                                            margin:
                                                "8px 0"
                                        }}
                                    >

                                        <strong>
                                            Departure:
                                        </strong>{" "}

                                        {
                                            schedule.departure
                                        }

                                    </p>

                                </div>

                            )
                        )

                    )}

                </div>

            )}

        </div>

    );

}

export default RailwayMap;