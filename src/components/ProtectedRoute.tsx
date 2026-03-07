import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
}

export function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { canAccess, loading: permLoading } = usePermissions();

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (module && !canAccess(module)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
