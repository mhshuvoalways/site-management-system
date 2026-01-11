import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { Login } from "./pages/Login";
import { BuildingControlPage } from "./pages/admin/BuildingControl";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminSiteDetail } from "./pages/admin/SiteDetail";
import { TransfersHistory } from './pages/admin/TransfersHistory';
import { AdminSiteManagers } from "./pages/admin/SiteManagers";
import { SiteWorkersPage } from "./pages/admin/SiteWorkers";
import { AdminSites } from "./pages/admin/Sites";
import { AdminStorage } from "./pages/admin/Storage";
import { UserManagement } from "./pages/admin/UserManagement";
import { SiteManagerBuildingControl } from "./pages/site-manager/BuildingControl";
import { SiteManagerDashboard } from "./pages/site-manager/Dashboard";
import { SiteManagerSiteDetail } from "./pages/site-manager/SiteDetail";
import { SiteManagerSiteWorkers } from "./pages/site-manager/SiteWorkers";
import { SiteManagerSitesList } from "./pages/site-manager/SitesList";
import { SiteManagerTransfersView } from "./pages/site-manager/TransfersView";
import { SiteManagerUsersView } from "./pages/site-manager/UsersView";
import { WorkerDashboard } from "./pages/worker/Dashboard";
import { WorkerTimeLogs } from "./pages/worker/TimeLogs";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/sites" element={<AdminSites />} />
                  <Route path="/sites/:id" element={<AdminSiteDetail />} />
                  <Route
                    path="/sites/:id/site-managers"
                    element={<AdminSiteManagers />}
                  />
                  <Route path="/transfers" element={<TransfersHistory />} />
                  <Route
                    path="/sites/:id/workers"
                    element={<SiteWorkersPage />}
                  />
                  <Route
                    path="/sites/:id/building-control"
                    element={<BuildingControlPage />}
                  />
                  <Route path="/storage" element={<AdminStorage />} />
                  <Route path="/product-database" element={<AdminStorage />} />
                  <Route path="/users" element={<UserManagement />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          <Route
            path="/site-manager/*"
            element={
              <ProtectedRoute allowedRoles={["site_manager"]}>
                <Routes>
                  <Route path="/" element={<SiteManagerDashboard />} />
                  <Route path="/sites" element={<SiteManagerSitesList />} />
                  <Route
                    path="/sites/:id"
                    element={<SiteManagerSiteDetail />}
                  />
                  <Route
                    path="/sites/:id/workers"
                    element={<SiteManagerSiteWorkers />}
                  />
                  <Route
                    path="/sites/:id/building-control"
                    element={<SiteManagerBuildingControl />}
                  />
                  <Route path="/transfers" element={<SiteManagerTransfersView />} />
                  <Route path="/users" element={<SiteManagerUsersView />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/*"
            element={
              <ProtectedRoute allowedRoles={["worker"]}>
                <Routes>
                  <Route path="/" element={<WorkerDashboard />} />
                  <Route path="/time-logs" element={<WorkerTimeLogs />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
