// Central place for static config + mock data.
// Swap the mock arrays below for real API data once the backend is ready
// (see utils/api.js, which already reads from here).

export const APP_NAME = "RAILWAY BLOCK PLANNING SYSTEM";
export const APP_TAGLINE_1 = "Safe Tracks";
export const APP_TAGLINE_2 = "Reliable Journeys";

export const ROLES = {
  ADMIN: "admin",
  OFFICER: "officer",
  TEAMS: "teams",
};

// TODO: replace with real authentication against the backend
export const mockUsers = [
  {
    username: "admin",
    password: "admin123",
    role: ROLES.ADMIN,
    name: "Admin User",
  },
  {
    username: "officer1",
    password: "officer123",
    role: ROLES.OFFICER,
    name: "Officer Sharma",
  },
  {
    username: "eng_team",
    password: "eng123",
    role: ROLES.TEAMS,
    department: "Engineering",
    name: "Engineering Team",
  },
  {
    username: "snt_team",
    password: "snt123",
    role: ROLES.TEAMS,
    department: "Signal & Telecom",
    name: "Signal & Telecom Team",
  },
  {
    username: "trd_team",
    password: "trd123",
    role: ROLES.TEAMS,
    department: "Traction",
    name: "Traction Distribution Team",
  },
];

export const departments = [
  "Signal & Telecom (SMMS)",
  "Engineering",
  "Traction Distribution",
];

export const assetTypes = ["Signal", "Track", "OHE", "Point Machine"];

export const maintenanceTypes = [
  "Routine Maintenance",
  "Corrective Maintenance",
  "Emergency Repair",
];

export const assetConditions = ["Good", "Fair", "Poor", "Critical"];

export const requestStatusStyles = {
  "AI Processing": "bg-amber-100 text-amber-700",
  Approved: "bg-green-100 text-green-700",
  Declined: "bg-red-100 text-red-700",
  "Waiting for Approval": "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
};

export const activityActionStyles = {
  "Created User": "bg-green-100 text-green-700",
  "Activated User": "bg-green-100 text-green-700",
  "Reset Password": "bg-blue-100 text-blue-700",
  "Deactivated User": "bg-red-100 text-red-700",
};

// TODO: replace with data fetched from the backend
// Clean initial state for live dynamic calculations
export const mockDashboardStats = [
  { key: "total", label: "Total Requests", value: 0 },
  { key: "pending", label: "Pending Requests", value: 0 },
  { key: "approved", label: "Approved Requests", value: 0 },
  { key: "active", label: "Active Work", value: 0 },
];

export const mockUpcomingMaintenance = [];

export const mockRequests = [];

export const mockTasksByDate = {};


export const mockAdminStats = [
  { label: "Total Users", value: 12 },
  { label: "Management Team", value: 8 },
  { label: "Officers", value: 3 },
  { label: "Admins", value: 1 },
];

export const mockDepartmentUsage = [];

// Clean initial activity log
export const mockActivity = [];

export const userDepartmentOptions = ["Engineering", "Signal & Telecom", "Traction", "Control"];
