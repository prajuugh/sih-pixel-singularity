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
    name: "System Admin",
  },
  {
    username: "officer",
    password: "officer123",
    role: ROLES.OFFICER,
    name: "Traffic Operations Officer",
  },
  {
    username: "teams",
    password: "teams123",
    role: ROLES.TEAMS,
    name: "Engineering Field Crew",
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
  APPROVED: "bg-green-100 text-green-700",
  Declined: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  "Waiting for Approval": "bg-blue-100 text-blue-700",
  Completed: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-teal-100 text-teal-800",
  WORK_COMPLETED: "bg-teal-100 text-teal-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
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

export const mockDepartmentUsage = [
  { name: "Engineering", count: 4, max: 4 },
  { name: "Signal & Telecom", count: 3, max: 4 },
  { name: "Traction", count: 3, max: 4 },
  { name: "Control", count: 2, max: 4 },
];

// TODO: replace with data fetched from the backend
export const mockActivity = [
  { date: "10 Sep 2026, 10:42", action: "Created User", user: "eng_team_03", details: "New management user added (Engineering)" },
  { date: "10 Sep 2026, 10:31", action: "Activated User", user: "st_team_02", details: "User account activated (Signal & Telecom)" },
  { date: "10 Sep 2026, 09:58", action: "Reset Password", user: "officer_01", details: "Password reset for officer account" },
  { date: "10 Sep 2026, 09:35", action: "Deactivated User", user: "trd_team_04", details: "User account deactivated (Traction)" },
  { date: "09 Sep 2026, 18:21", action: "Created User", user: "ctrl_admin_02", details: "New admin user added" },
];

export const userDepartmentOptions = ["Engineering", "Signal & Telecom", "Traction", "Control"];
