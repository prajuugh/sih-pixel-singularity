// Thin API layer. Every function returns a Promise so pages can already be
// written against an async interface. Right now they resolve mock data from
// constants.js after a short simulated delay - swap the body of each
// function for a real `fetch(BASE_URL + "/...")` call once the backend
// exists, and the pages that call them won't need to change.

import {
  mockUsers,
  mockRequests,
  mockDashboardStats,
  mockUpcomingMaintenance,
  mockTasksByDate,
  mockAdminStats,
  mockDepartmentUsage,
  mockActivity,
} from "./constants";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function delay(data, ms = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ---- Auth ----
export function loginRequest(username, password) {
  const found = mockUsers.find(
    (u) => u.username === username && u.password === password
  );
  if (found) return delay({ success: true, user: found });
  return delay({ success: false, message: "Invalid username or password" });
}

// ---- Teams / Officer shared dashboard ----
export function fetchDashboardStats() {
  return delay(mockDashboardStats);
}

export function fetchUpcomingMaintenance() {
  return delay(mockUpcomingMaintenance);
}

// ---- Requests (submit / check status / approvals) ----
export function fetchRequests() {
  return delay(mockRequests);
}

export function submitRequest(payload) {
  // TODO: POST payload to the backend
  console.log("submitRequest", payload);
  return delay({ success: true, requestId: payload.requestId });
}

export function updateRequestStatus(requestId, status) {
  // TODO: PATCH request status on the backend
  console.log("updateRequestStatus", requestId, status);
  return delay({ success: true });
}

// ---- Calendar ----
export function fetchTasksByDate() {
  return delay(mockTasksByDate);
}

// ---- Admin ----
export function fetchAdminStats() {
  return delay(mockAdminStats);
}

export function fetchDepartmentUsage() {
  return delay(mockDepartmentUsage);
}

export function fetchRecentActivity() {
  return delay(mockActivity);
}

export function fetchUsers() {
  return delay(mockUsers);
}

export function createUser(form) {
  // TODO: POST new user to the backend
  console.log("createUser", form);
  return delay({ success: true });
}

export function deleteUser(username) {
  // TODO: DELETE user on the backend
  console.log("deleteUser", username);
  return delay({ success: true });
}
