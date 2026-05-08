import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">权限不足</h2>
          <p className="text-zinc-400">此功能需要专业版账户</p>
          <button onClick={() => window.location.href = '/'} className="btn-primary">返回首页</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
