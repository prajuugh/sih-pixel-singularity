const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());


// ========================================
// LOAD TRACK DATA
// ========================================

const tracksPath = path.join(
    __dirname,
    "..",
    "data",
    "karnataka_tracks.geojson"
);

const tracks = JSON.parse(
    fs.readFileSync(tracksPath, "utf8")
);

console.log(
    `Loaded ${tracks.features.length} railway tracks`
);


// ========================================
// LOAD TRAIN SCHEDULES
// ========================================

const trainSchedulesPath = path.join(
    __dirname,
    "data",
    "trainSchedules.json"
);

const trainSchedules = JSON.parse(
    fs.readFileSync(trainSchedulesPath, "utf8")
);

console.log(
    `Loaded ${trainSchedules.length} train schedules`
);


// ========================================
// GET ALL TRACKS
// ========================================

app.get("/api/tracks", (req, res) => {

    res.json(tracks);

});


// ========================================
// GET ONE TRACK
// ========================================

app.get("/api/tracks/:trackId", (req, res) => {

    const trackId = req.params.trackId;


    const track = tracks.features.find(
        feature =>
            feature.properties.track_id === trackId
    );


    if (!track) {

        return res.status(404).json({
            message: "Track not found"
        });

    }


    res.json(track);

});


// ========================================
// GET TRAIN SCHEDULE FOR A TRACK
// ========================================
// ========================================
// GET TRAIN SCHEDULE FOR A TRACK
// ========================================

app.get(
    "/api/tracks/:trackId/schedule",
    (req, res) => {

        const trackId =
            req.params.trackId;

        const requestedDay =
            req.query.day
                ?.toUpperCase();


        const schedules = [];


        // Search through every train
        for (const train of trainSchedules) {

            // --------------------------------
            // CHECK OPERATING DAY
            // --------------------------------

            if (
                requestedDay &&
                !train.operatingDays.includes(
                    requestedDay
                )
            ) {
                continue;
            }


            // --------------------------------
            // FIND TRACK IN TRAIN ROUTE
            // --------------------------------

            const routeEntry =
                train.route.find(
                    section =>
                        section.trackId ===
                        trackId
                );


            // --------------------------------
            // TRAIN USES THIS TRACK
            // --------------------------------

            if (routeEntry) {

                schedules.push({

                    trainNo:
                        train.trainNo,

                    trainName:
                        train.trainName,

                    source:
                        train.source,

                    destination:
                        train.destination,

                    operatingDays:
                        train.operatingDays,

                    trackId:
                        routeEntry.trackId,

                    arrival:
                        routeEntry.arrival,

                    departure:
                        routeEntry.departure

                });

            }

        }


        res.json({

            trackId:
                trackId,

            requestedDay:
                requestedDay || "ALL",

            trainCount:
                schedules.length,

            schedules:
                schedules

        });

    }
);


// ========================================
// GET COMPLETE ROUTE OF A TRAIN
// ========================================

app.get(
    "/api/trains/:trainNo/route",
    (req, res) => {

        const trainNo = req.params.trainNo;


        const train = trainSchedules.find(
            train =>
                train.trainNo === trainNo
        );


        if (!train) {

            return res.status(404).json({

                message: "Train not found"

            });

        }


        res.json(train);

    }
);


// ========================================
// GET ALL TRAIN SCHEDULES
// ========================================

app.get(
    "/api/trains",
    (req, res) => {

        res.json({

            trainCount:
                trainSchedules.length,

            trains:
                trainSchedules

        });

    }
);


// ========================================
// START SERVER
// ========================================

const PORT = 3000;

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});