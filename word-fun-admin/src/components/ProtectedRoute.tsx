import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
    const auth = useContext(AuthContext);

    if (auth?.loading) {
        return <div>Loading authentication...</div>;
    }

    if (!auth?.user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
