import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";

import AdminDashboard from "../pages/admin/AdminDashboard";

import OfficerDashboard from "../pages/officer/OfficerDashboard";
import OfficerCalendar from "../pages/officer/OfficerCalendar";
import OfficerRequests from "../pages/officer/OfficerRequests";
import ApprovedRequests from "../pages/officer/ApprovedRequests";
import LiveMap from "../pages/officer/LiveMap";

import TeamsDashboard from "../pages/teams/TeamsDashboard";
import TeamRequests from "../pages/teams/TeamRequests";
import TeamCalendar from "../pages/teams/TeamCalendar";
import CheckStatus from "../pages/teams/CheckStatus";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Officer */}
      <Route
        path="/officer"
        element={
          <ProtectedRoute allowedRole="officer">
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/calendar"
        element={
          <ProtectedRoute allowedRole="officer">
            <OfficerCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/requests"
        element={
          <ProtectedRoute allowedRole="officer">
            <OfficerRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/approved-requests"
        element={
          <ProtectedRoute allowedRole="officer">
            <ApprovedRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/live-map"
        element={
          <ProtectedRoute allowedRole="officer">
            <LiveMap />
          </ProtectedRoute>
        }
      />

      {/* Teams */}
      <Route
        path="/teams"
        element={
          <ProtectedRoute allowedRole="teams">
            <TeamsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/requests"
        element={
          <ProtectedRoute allowedRole="teams">
            <TeamRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/calendar"
        element={
          <ProtectedRoute allowedRole="teams">
            <TeamCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/check-status"
        element={
          <ProtectedRoute allowedRole="teams">
            <CheckStatus />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
