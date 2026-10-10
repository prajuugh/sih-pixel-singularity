// backend/scripts/import_tracks.js
// Generates and imports 5,461 LineString track segments covering Karnataka railway geography

function generateKarnatakaTracks(count = 5461) {
  const tracks = [];

  // Key Karnataka railway hubs / lat-lng anchors
  const hubs = [
    { name: "Bengaluru City (SBC)", lat: 12.9778, lng: 77.5667 },
    { name: "Yesvantpur (YPR)", lat: 13.0232, lng: 77.5512 },
    { name: "Mysuru Junction (MYS)", lat: 12.3164, lng: 76.6459 },
    { name: "Hubballi Junction (UBL)", lat: 15.3524, lng: 75.1438 },
    { name: "Mangaluru Central (MAQ)", lat: 12.8649, lng: 74.8430 },
    { name: "Kalaburagi / Gulbarga (KLBG)", lat: 17.3297, lng: 76.8343 },
    { name: "Belagavi / Belgaum (BGM)", lat: 15.8497, lng: 74.4977 },
    { name: "Davanagere (DVG)", lat: 14.4644, lng: 75.9218 },
    { name: "Hassan Junction (HAS)", lat: 13.0072, lng: 76.1013 },
    { name: "Ballari Junction (BAY)", lat: 15.1394, lng: 76.9214 },
  ];

  const railways = ["rail", "rail", "rail", "narrow_gauge", "rail"];
  const gauges = ["broad", "broad", "broad", "meter"];
  const electrifieds = ["contact_line", "contact_line", "no"];

  for (let i = 1; i <= count; i++) {
    const trackId = `KA-T-${String(i).padStart(6, "0")}`;
    const osmId = `${3000000000 + i}`;

    // Select start and end hub or nearby coordinate
    const startHub = hubs[(i - 1) % hubs.length];
    const endHub = hubs[i % hubs.length];

    // Micro step coordinates creating realistic LineString segments
    const stepRatio = ((i % 100) / 100);
    const startLng = startHub.lng + (endHub.lng - startHub.lng) * stepRatio + (Math.sin(i) * 0.05);
    const startLat = startHub.lat + (endHub.lat - startHub.lat) * stepRatio + (Math.cos(i) * 0.05);

    const endLng = startLng + 0.02 + (Math.sin(i * 2) * 0.01);
    const endLat = startLat + 0.015 + (Math.cos(i * 2) * 0.01);

    // WKT LineString: LINESTRING(lng1 lat1, lng2 lat2)
    const wktGeometry = `LINESTRING(${startLng.toFixed(6)} ${startLat.toFixed(6)}, ${endLng.toFixed(6)} ${endLat.toFixed(6)})`;

    const railway = railways[i % railways.length];
    const gauge = gauges[i % gauges.length];
    const electrified = electrifieds[i % electrifieds.length];
    const maxspeed = 90 + ((i * 7) % 40); // 90 to 130 km/h
    const passengerLines = (i % 2 === 0) ? 2 : 1;
    const usage = (i % 5 === 0) ? "branch" : "main";
    const voltage = electrified === "contact_line" ? "25000" : "0";

    tracks.push({
      track_id: trackId,
      osm_id: osmId,
      geometry: wktGeometry,
      railway,
      gauge,
      electrified,
      frequency: electrified === "contact_line" ? "50" : "0",
      maxspeed,
      passenger_lines: passengerLines,
      usage,
      voltage,
      geojson: {
        type: "Feature",
        properties: { track_id: trackId, maxspeed, electrified, usage },
        geometry: {
          type: "LineString",
          coordinates: [
            [parseFloat(startLng.toFixed(6)), parseFloat(startLat.toFixed(6))],
            [parseFloat(endLng.toFixed(6)), parseFloat(endLat.toFixed(6))]
          ]
        }
      }
    });
  }

  return tracks;
}

module.exports = { generateKarnatakaTracks };
