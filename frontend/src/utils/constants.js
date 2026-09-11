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

export const mockRequests = [
  {
    id: "ENG-2026-00001",
    type: "Track Tamping & Alignment",
    department: "Engineering",
    date: "2026-09-15",
    status: "Approved",
    stage: "Scheduled",
    reason: "Ballast packing and dynamic track stabilization",
    updated: "2026-09-10",
    priorityScore: 85,
    conflict: false,
    recommendedBlock: {
      date: "2026-09-15",
      startTime: "19:00",
      endTime: "21:00",
      trackId: "KA-T-000342",
      priorityScore: 85,
    },
    raw: {
      request_id: "ENG-2026-00001",
      department: "Engineering",
      task_type: "Track Tamping & Alignment",
      track_id: "KA-T-000342",
      track_ids: ["KA-T-000342"],
      status: "APPROVED",
      preferred_start_time: "19:00",
      preferred_end_time: "21:00",
      estimated_duration_minutes: 120,
      description: "Ballast packing and dynamic track stabilization",
    },
  },
  {
    id: "SIG-2026-00002",
    type: "Point Machine & Interlocking Overhaul",
    department: "Signal & Telecom",
    date: "2026-09-15",
    status: "Approved",
    stage: "Scheduled",
    reason: "Dual motor point machine alignment & electronic relay testing",
    updated: "2026-09-10",
    priorityScore: 78,
    conflict: false,
    recommendedBlock: {
      date: "2026-09-15",
      startTime: "21:00",
      endTime: "22:30",
      trackId: "KA-T-000100",
      priorityScore: 78,
    },
    raw: {
      request_id: "SIG-2026-00002",
      department: "Signal & Telecom",
      task_type: "Point Machine & Interlocking Overhaul",
      track_id: "KA-T-000100",
      track_ids: ["KA-T-000100"],
      status: "APPROVED",
      preferred_start_time: "21:00",
      preferred_end_time: "22:30",
      estimated_duration_minutes: 90,
      description: "Dual motor point machine alignment & electronic relay testing",
    },
  },
  {
    id: "TRD-2026-00003",
    type: "OHE 25kV Cantilever & Wire Inspection",
    department: "Traction Distribution",
    date: "2026-09-15",
    status: "Approved",
    stage: "Scheduled",
    reason: "Overhead catenary inspection and contact wire height calibration",
    updated: "2026-09-10",
    priorityScore: 92,
    conflict: false,
    recommendedBlock: {
      date: "2026-09-15",
      startTime: "22:30",
      endTime: "00:30",
      trackId: "KA-T-000550",
      priorityScore: 92,
    },
    raw: {
      request_id: "TRD-2026-00003",
      department: "Traction Distribution",
      task_type: "OHE 25kV Cantilever & Wire Inspection",
      track_id: "KA-T-000550",
      track_ids: ["KA-T-000550"],
      status: "APPROVED",
      preferred_start_time: "22:30",
      preferred_end_time: "00:30",
      estimated_duration_minutes: 120,
      description: "Overhead catenary inspection and contact wire height calibration",
    },
  },
];

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
