import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Activity } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#191A1A] flex flex-col items-center justify-center text-[#191A1A] dark:text-[#EDEDED] transition-colors duration-200">
        <div className="w-12 h-12 rounded-2xl bg-[#20B2AA]/15 border border-[#20B2AA]/30 flex items-center justify-center animate-pulse mb-4">
          <Activity className="w-6 h-6 text-[#20B2AA] animate-spin" />
        </div>
        <p className="text-sm font-medium text-[#737878] dark:text-[#9EA3A3]">Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
