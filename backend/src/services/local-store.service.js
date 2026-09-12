const fs = require("fs");
const path = require("path");

const storePath = process.env.LOCAL_STORE_PATH
  ? path.resolve(process.env.LOCAL_STORE_PATH)
  : path.join(__dirname, "../../data/runtime-store.json");

const persistedKeys = [
  "users",
  "maintenance_requests",
  "planning_alternatives",
  "request_reviews",
  "audit_logs",
  "block_plans",
  "blocks",
  "block_tasks",
];

function snapshotStore(store) {
  return Object.fromEntries(
    persistedKeys.map((key) => [key, Array.isArray(store[key]) ? store[key] : []])
  );
}

function persistLocalStore(store) {
  const directory = path.dirname(storePath);
  const tempPath = `${storePath}.tmp`;
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(tempPath, JSON.stringify(snapshotStore(store), null, 2), "utf8");
  fs.renameSync(tempPath, storePath);
}

function hydrateLocalStore(store) {
  if (!fs.existsSync(storePath)) {
    persistLocalStore(store);
    return { restored: false, requestCount: store.maintenance_requests.length };
  }

  try {
    const saved = JSON.parse(fs.readFileSync(storePath, "utf8"));
    for (const key of persistedKeys) {
      if (key === "users") {
        if (Array.isArray(saved[key]) && saved[key].length > 0) {
          const savedEmails = new Set(saved[key].map((u) => (u.email || "").toLowerCase()));
          const mergedUsers = [...saved[key]];
          for (const seedUser of (store.users || [])) {
            if (seedUser.email && !savedEmails.has(seedUser.email.toLowerCase())) {
              savedEmails.add(seedUser.email.toLowerCase());
              mergedUsers.push(seedUser);
            }
          }
          store.users = mergedUsers;
        }
      } else if (Array.isArray(saved[key])) {
        store[key] = saved[key];
      }
    }
    return { restored: true, requestCount: store.maintenance_requests.length };
  } catch (error) {
    console.warn(`Local store could not be restored (${error.message}); using seed data.`);
    persistLocalStore(store);
    return { restored: false, requestCount: store.maintenance_requests.length };
  }
}

module.exports = {
  hydrateLocalStore,
  persistLocalStore,
  storePath,
};
