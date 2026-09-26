import { lazy, Suspense } from "react";
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
import TeamMaintenance from "../pages/teams/TeamMaintenance";

import ProtectedRoute from "./ProtectedRoute";

const LandingPage = lazy(() => import("../pages/LandingPage"));

function LandingFallback() {
  return (
    <div
      className="min-h-screen bg-white"
      role="status"
      aria-label="Loading Railway Block Planning System"
    />
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<LandingFallback />}>
            <LandingPage />
          </Suspense>
        }
      />
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
            <LiveMap isSubmitDefault={true} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/maintenance"
        element={
          <ProtectedRoute allowedRole="teams">
            <TeamMaintenance />
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
      <Route
        path="/teams/live-map"
        element={
          <ProtectedRoute allowedRole="teams">
            <LiveMap />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
