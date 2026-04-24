import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { WeightTrackerProvider } from "./context/WeightTrackerContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { DataPage } from "./pages/DataPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { SilentRenewPage } from "./pages/SilentRenewPage";

export default function App() {
  return (
    <BrowserRouter>
      {/*
        AuthProvider wraps everything — it initialises the OIDC session on
        mount and provides auth state to all children.
      */}
      <AuthProvider>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/silent-renew" element={<SilentRenewPage />} />

          {/* Protected routes — require a valid session */}
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <WeightTrackerProvider>
                  <AppLayout />
                </WeightTrackerProvider>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
