import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WeightTrackerProvider } from "./context/WeightTrackerContext";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { DataPage } from "./pages/DataPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <WeightTrackerProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </WeightTrackerProvider>
    </BrowserRouter>
  );
}
