import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Media from './pages/Media';

// A wrapper to protect dashboard routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <>
      {/* Dynamic Background */}
      <div className="bg-mesh"></div>
      
      {!isDashboard && <Navbar />}

      <main style={!isDashboard ? { paddingTop: '80px', minHeight: 'calc(100vh - 80px)' } : {}}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="posts" element={<Posts />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="media" element={<Media />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </main>
    </>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId="1067312129172-l7l9p2t0d3bdlefpav3bsubmfjtqekmc.apps.googleusercontent.com">
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
