import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateGroup from './pages/CreateGroup';
import JoinGroup from './pages/JoinGroup';
import GroupDetails from './pages/GroupDetails';
import AddExpense from './pages/AddExpense';
import GroupSettings from './pages/GroupSettings';
import UserProfile from './pages/UserProfile';
import Layout from './components/Layout';

import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }

    return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route element={
          <ProtectedRoute>
              <Layout />
          </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups/create" element={<CreateGroup />} />
        <Route path="/groups/join" element={<JoinGroup />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/groups/:groupId/add-expense" element={<AddExpense />} />
        <Route path="/groups/:groupId/edit-expense/:expenseId" element={<AddExpense />} />
        <Route path="/groups/:groupId/settings" element={<GroupSettings />} />
        <Route path="/profile" element={<UserProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
