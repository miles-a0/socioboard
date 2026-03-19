import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      width: '100%',
      zIndex: 50,
      padding: '1rem 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo area */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
          <div style={{
            background: 'var(--gradient-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--border-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LayoutDashboard size={24} color="white" />
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

        {/* Navigation links inside a glass pill */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '0.5rem 1.5rem',
          borderRadius: '9999px', // Pill shape
        }}>
          <Link to="/" style={{ 
            color: location.pathname === '/' ? 'var(--accent-color)' : 'var(--text-primary)',
            fontWeight: location.pathname === '/' ? 600 : 500,
            fontSize: '0.9rem'
          }}>
            Home
          </Link>
          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--glass-border)' }}></div>
          <Link to="/login" style={{ 
            color: location.pathname === '/login' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}>
            Sign In
          </Link>
          <Link to="/signup" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
