import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      maxWidth: '1600px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1 // Above the background mesh
    }}>
      <Sidebar />
      
      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto', // Scrollable content independently from sidebar
        height: '100vh'
      }}>
        <div style={{ maxWidth: '1000px', width: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
