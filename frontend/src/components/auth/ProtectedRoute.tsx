/**
 * Route guard that redirects unauthenticated users to /login.
 *
 * Renders a full-screen spinner while the initial session check runs
 * (isLoading = true) so there is no flash of the login page for users
 * who have a valid cached session.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../ui/Spinner";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner size={32} color="#3b82f6" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
