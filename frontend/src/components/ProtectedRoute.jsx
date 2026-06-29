import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg text-gray-400">
        <div className="flex flex-col items-center space-y-4">
          {/* Pulsing loading spinner */}
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide">Validating session credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel max-w-md p-8 rounded-2xl border-danger/30">
          <div className="w-16 h-16 bg-danger/10 border border-danger/30 rounded-full flex items-center justify-center mx-auto mb-4 text-danger animate-pulse">
            ⚠️
          </div>
          <h2 className="text-xl font-bold font-display text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6">
            You do not have the required permissions ({requiredRole}) to access this page. Please contact your system administrator.
          </p>
          <a
            href="/"
            className="px-5 py-2.5 bg-primary hover:bg-indigo-700 text-white font-medium rounded-xl transition duration-200 inline-block"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
