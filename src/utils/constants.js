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
export const mockDashboardStats = [
  { key: "total", label: "Total Requests", value: 24 },
  { key: "pending", label: "Pending Requests", value: 5 },
  { key: "approved", label: "Approved Requests", value: 14 },
  { key: "active", label: "Active Work", value: 2 },
];

// TODO: replace with data fetched from the backend
export const mockUpcomingMaintenance = [
  { day: "11", month: "SEP", time: "01:00 - 02:30", requestId: "SMMS-2026-00782", name: "Point Machine Inspection", department: "Signal & Telecom", description: "Preventive inspection of point machine operation." },
  { day: "12", month: "SEP", time: "10:30 - 12:30", requestId: "TMS-2026-00124", name: "Rail Grinding", department: "Engineering", description: "Track surface grinding for defect removal." },
  { day: "14", month: "SEP", time: "23:00 - 01:00", requestId: "TMS-2026-00128", name: "Track Maintenance", department: "Engineering", description: "Routine track maintenance work." },
  { day: "18", month: "SEP", time: "02:00 - 04:00", requestId: "SMMS-2026-00098", name: "Signal Cable Replacement", department: "Signal & Telecom", description: "Replacement of damaged signal cables." },
  { day: "21", month: "SEP", time: "11:00 - 13:00", requestId: "TMS-2026-00131", name: "OHE Maintenance", department: "Traction Distribution", description: "Inspection and maintenance of OHE equipment." },
];

// TODO: replace with data fetched from the backend
export const mockRequests = [
  {
    id: "SMMS-2026-00782",
    type: "Point Machine Inspection",
    department: "Signal & Telecom",
    date: "11-09-2026",
    status: "AI Processing",
    reason: "Request is currently being evaluated by the AI planning system. Priority assessment and block optimization are in progress.",
    stage: "Priority Evaluation",
    updated: "10-09-2026, 14:32",
  },
  {
    id: "TMS-2026-00124",
    type: "Rail Grinding",
    department: "Engineering",
    date: "10-09-2026",
    status: "Waiting for Approval",
    reason: "Pending sign-off from the officer on duty.",
    stage: "Officer Review",
    updated: "09-09-2026, 09:10",
  },
  {
    id: "TMS-2026-00125",
    type: "Track Repair",
    department: "Engineering",
    date: "12-09-2026",
    status: "Declined",
    reason: "Declined due to conflicting block allocation on the requested section.",
    stage: "Closed",
    updated: "08-09-2026, 16:45",
  },
  {
    id: "SMMS-2026-00098",
    type: "Signal Cable Replacement",
    department: "Signal & Telecom",
    date: "08-09-2026",
    status: "Waiting for Approval",
    reason: "Pending sign-off from the Signal & Telecom department head.",
    stage: "Departmental Review",
    updated: "07-09-2026, 11:20",
  },
  {
    id: "TMS-2026-00120",
    type: "OHE Maintenance",
    department: "Traction Distribution",
    date: "05-09-2026",
    status: "Completed",
    reason: "Maintenance work completed and verified.",
    stage: "Closed",
    updated: "05-09-2026, 18:00",
  },
];

// TODO: replace with data fetched from the backend, keyed by "YYYY-MM-DD"
export const mockTasksByDate = {
  "2026-09-05": [{ id: "TMS-2026-00090", name: "Signal Check", department: "Signal & Telecom", description: "Routine signal check." }],
  "2026-09-08": [{ id: "TMS-2026-00110", name: "Track Patrol", department: "Engineering", description: "Scheduled track patrol." }],
  "2026-09-11": [{ id: "SMMS-2026-00782", name: "Point Machine Inspection", department: "Signal & Telecom", description: "Preventive inspection of point machine operation." }],
  "2026-09-14": [{ id: "TMS-2026-00128", name: "Track Maintenance", department: "Engineering", description: "Routine track maintenance work." }],
  "2026-09-22": [{ id: "SMMS-2026-00098", name: "Signal Cable Replacement", department: "Signal & Telecom", description: "Replacement of damaged signal cables." }],
  "2026-09-27": [{ id: "TMS-2026-00131", name: "OHE Maintenance", department: "Traction Distribution", description: "Inspection and maintenance of OHE equipment." }],
};

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
