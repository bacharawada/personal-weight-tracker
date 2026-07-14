import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { WeightTrackerProvider } from "./context/WeightTrackerContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { DataPage } from "./pages/DataPage/DataPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { AboutPage } from "./pages/AboutPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { SilentRenewPage } from "./pages/SilentRenewPage";
import { SharePage } from "./pages/SharePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*
          Public shared dashboard — deliberately mounted OUTSIDE AuthProvider
          so it never initialises an OIDC session or requires a login. It
          fetches only the token-scoped public endpoints.
        */}
        <Route path="/share/:token" element={<SharePage />} />

        {/* Everything else runs inside the authenticated app tree. */}
        <Route
          path="/*"
          element={
            <AuthProvider>
              <Routes>
                {/* Public routes — no auth required */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/about" element={<AboutPage />} />
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
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>
              </Routes>
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
