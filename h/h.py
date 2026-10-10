import json

INPUT_FILE = "export.geojson"
OUTPUT_FILE = "karnataka_tracks.geojson"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

for index, feature in enumerate(data["features"], start=1):

    # Create our own application-specific track ID
    track_id = f"KA-T-{index:06d}"

    # Preserve the original OSM ID
    osm_id = feature.get("id")

    # Add our IDs to the properties
    feature["properties"]["track_id"] = track_id
    feature["properties"]["osm_id"] = osm_id

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Processed {len(data['features'])} tracks.")
print(f"Saved to {OUTPUT_FILE}")