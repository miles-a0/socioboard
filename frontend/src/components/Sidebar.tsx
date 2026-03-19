import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Calendar as CalendarIcon,
  Edit3,
  Settings as SettingsIcon,
  LogOut,
  LayoutDashboard,
  Image as ImageIcon,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Edit3 size={20} />, label: 'Posts', path: '/dashboard/posts' },
    { icon: <ImageIcon size={20} />, label: 'Media Library', path: '/dashboard/media' },
    { icon: <CalendarIcon size={20} />, label: 'Calendar', path: '/dashboard/calendar' },
    { icon: <BarChart2 size={20} />, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: <SettingsIcon size={20} />, label: 'Settings', path: '/dashboard/settings' },
  ];

  return (
    <aside className="glass-panel" style={{
      width: '260px',
      height: 'calc(100vh - 2rem)',
      position: 'sticky',
      top: '1rem',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      borderRadius: 'var(--border-radius-lg)',
      margin: '1rem' // Margin to float it slightly
    }}>
      {/* Brand */}
      <div style={{ marginBottom: '2.5rem', padding: '0 0.5rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--gradient-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--border-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LayoutDashboard size={20} color="white" />
          </div>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            Socioboard
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'} // exact match for overview
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive ? 'var(--gradient-primary)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              transition: 'all var(--transition-fast)'
            })}
            className={({ isActive }) => !isActive ? 'sidebar-link-hover' : ''} // Optional hover class we can add
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Summary */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: 'white'
          }}>
            {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100px' }}>
              {user?.username || 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Free Plan</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: '0.5rem', transition: 'color 0.2s', outline: 'none'
            }} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: '0.5rem', transition: 'color 0.2s', outline: 'none'
            }} 
            title="Logout"
            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
