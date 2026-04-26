import React from 'react';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/roleGuard';

const ProtectedRoute = ({ feature, children }) => {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!canAccess(role, feature)) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
