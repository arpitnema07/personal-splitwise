import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const Layout = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Users size={28} /> Splitwise
        </div>
        
        <nav className="sidebar-nav">
           <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
              <Home size={20} /> Dashboard
           </Link>
           <Link to="/groups/create" className={`nav-item ${isActive('/groups/create') ? 'active' : ''}`}>
              <PlusCircle size={20} /> Create Group
           </Link>
           <Link to="/groups/join" className={`nav-item ${isActive('/groups/join') ? 'active' : ''}`}>
              <Users size={20} /> Join Group
           </Link>
           <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
              <Avatar user={user} size="w-8 h-8" />
              Profile
           </Link>
        </nav>

        <button onClick={() => { logout(); window.location.href = '/login'; }} className="logout-btn">
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper">
             <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <Link to="/dashboard" className={`mobile-nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
           <Home size={24} />
           <span>Home</span>
        </Link>
        <Link to="/groups/create" className={`mobile-nav-item ${isActive('/groups/create') ? 'active' : ''}`}>
           <PlusCircle size={24} />
           <span>Create</span>
        </Link>
        <Link to="/groups/join" className={`mobile-nav-item ${isActive('/groups/join') ? 'active' : ''}`}>
           <Users size={24} />
           <span>Join</span>
        </Link>
        <Link to="/profile" className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}>
           <Avatar user={user} size="w-8 h-8" />
           <span>Profile</span>
        </Link>
        <button onClick={() => { logout(); window.location.href = '/login'; }} className="mobile-nav-item">
            <LogOut size={24} />
            <span>Logout</span>
        </button>
      </nav>
    </div>
  );
};


export default Layout;
