import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Lock, Mail, Shield, Save, CheckCircle, Facebook, Twitter, Linkedin, Link2, RefreshCw, Trash2, Ghost } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Settings: React.FC = () => {
  const getAuthUrl = (provider: string) => {
    const token = localStorage.getItem('token');
    return `/api/auth/${provider}/login?token=${token}${provider === 'twitter' ? '&t=' + Date.now() : ''}`;
  };
  const { user } = useAuth();
  const location = useLocation();
  
  // Profile State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Connections State
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [pinterestConnected, setPinterestConnected] = useState(false);
  const [snapchatConnected, setSnapchatConnected] = useState(false);

  // Email Integrations State
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [sendgridSenderEmail, setSendgridSenderEmail] = useState('');
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false);
  const [emailSettingsSuccess, setEmailSettingsSuccess] = useState('');
  const [emailSettingsError, setEmailSettingsError] = useState('');

  // Hydrate form initially
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  // Hydrate connections from API
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await api.get('/users/me/connections');
        const connections = response.data;
        setFacebookConnected(connections.some((c: any) => c.provider === 'facebook'));
        setTwitterConnected(connections.some((c: any) => c.provider === 'twitter'));
        setLinkedinConnected(connections.some((c: any) => c.provider === 'linkedin'));
        setPinterestConnected(connections.some((c: any) => c.provider === 'pinterest'));
        setSnapchatConnected(connections.some((c: any) => c.provider === 'snapchat'));
      } catch (err) {
        console.error("Failed to fetch user connection state", err);
      }
    };

    const fetchEmailSettings = async () => {
      try {
        const response = await api.get('/users/me/email-settings');
        setSendgridApiKey(response.data.sendgrid_api_key || '');
        setSendgridSenderEmail(response.data.sendgrid_sender_email || '');
      } catch (err) {
        console.error("Failed to fetch email settings", err);
      }
    };
    
    if (user) {
      fetchConnections();
      fetchEmailSettings();
    }

    // Still read URL params for immediate responsive feedback on redirect
    const params = new URLSearchParams(location.search);
    const connected = params.get('connected');
    const errorParam = params.get('error');
    if (connected === 'facebook') setFacebookConnected(true);
    if (connected === 'twitter') setTwitterConnected(true);
    if (connected === 'linkedin') setLinkedinConnected(true);
    if (connected === 'pinterest') setPinterestConnected(true);
    if (connected === 'snapchat') setSnapchatConnected(true);
    
    // Clear the URL params after consuming them
    if (connected || errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, user]);

  const handleDisconnect = async (provider: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${provider}?`)) return;
    try {
      await api.delete(`/users/me/connections/${provider}`);
      if (provider === 'facebook') setFacebookConnected(false);
      if (provider === 'twitter') setTwitterConnected(false);
      if (provider === 'linkedin') setLinkedinConnected(false);
      if (provider === 'pinterest') setPinterestConnected(false);
      if (provider === 'snapchat') setSnapchatConnected(false);
    } catch (err) {
      console.error(`Failed to disconnect ${provider}`);
      alert(`Failed to disconnect ${provider}`);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await api.put('/users/me', { username, email });
      // To globally update React state without a hard reload, we could trigger a refetch
      // For now, we'll explicitly update success state.
      setProfileSuccess('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      setPasswordLoading(false);
      return;
    }

    try {
      await api.post('/users/me/password', { 
        current_password: currentPassword, 
        new_password: newPassword 
      });
      setPasswordSuccess('Password was successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSettingsLoading(true);
    setEmailSettingsError('');
    setEmailSettingsSuccess('');

    try {
      await api.put('/users/me/email-settings', { 
        sendgrid_api_key: sendgridApiKey, 
        sendgrid_sender_email: sendgridSenderEmail 
      });
      setEmailSettingsSuccess('Email integrations updated successfully.');
    } catch (err: any) {
      setEmailSettingsError(err.response?.data?.detail || 'Failed to update email settings.');
    } finally {
      setEmailSettingsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Account Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your profile information and security preferences.</p>
      </header>

      {/* Profile Settings */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <User size={24} color="var(--primary-color)" />
          <h2 style={{ fontSize: '1.25rem' }}>My Profile</h2>
        </div>

        {profileSuccess && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', 
            color: '#10b981', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' 
          }}>
            <CheckCircle size={16} />
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="input-group">
              <label>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)' }} 
                  required 
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)' }} 
                  required 
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={profileLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={16} />
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Password and Security */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Shield size={24} color="#f59e0b" />
          <h2 style={{ fontSize: '1.25rem' }}>Security & Password</h2>
        </div>

        {passwordSuccess && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', 
            color: '#10b981', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' 
          }}>
            <CheckCircle size={16} />
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            <div className="input-group">
              <label>Current Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)', maxWidth: '400px' }} 
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)', maxWidth: '400px' }} 
                  required 
                  minLength={8}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)', maxWidth: '400px' }} 
                  required 
                  minLength={8}
                />
              </div>
            </div>
            
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button type="submit" className="btn btn-primary" disabled={passwordLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f59e0b' }}>
              <Lock size={16} />
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Email Integrations */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Mail size={24} color="#8b5cf6" />
          <h2 style={{ fontSize: '1.25rem' }}>Email Integrations & Notifications</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Connect your SendGrid API Key natively to act as an autonomous notification engine. Socioboard will automatically dispatch styled email reports to you whenever an offline scheduled post is successfully delivered to the live API or encounters an immediate error.
        </p>

        {emailSettingsSuccess && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', 
            color: '#10b981', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' 
          }}>
            <CheckCircle size={16} />
            {emailSettingsSuccess}
          </div>
        )}

        {emailSettingsError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {emailSettingsError}
          </div>
        )}

        <form onSubmit={handleEmailSettingsUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            <div className="input-group">
              <label>SendGrid Verified Sender Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="email" 
                  value={sendgridSenderEmail}
                  onChange={(e) => setSendgridSenderEmail(e.target.value)}
                  placeholder="e.g. notifications@mycompany.com"
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)' }} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>SendGrid API Key</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="password" 
                  value={sendgridApiKey}
                  onChange={(e) => setSendgridApiKey(e.target.value)}
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxx"
                  style={{ paddingLeft: '2.75rem', background: 'var(--bg-input)' }} 
                />
              </div>
            </div>
            
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={emailSettingsLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b5cf6' }}>
              <Save size={16} />
              {emailSettingsLoading ? 'Saving Config...' : 'Save Email Integrations'}
            </button>
          </div>
        </form>
      </div>

      {/* Social Media Connections */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link2 size={24} color="#3b82f6" />
          <h2 style={{ fontSize: '1.25rem' }}>Social Connections</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Link your official social media accounts to enable live API publishing capabilities.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Facebook */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(24, 119, 242, 0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <Facebook size={24} color="#1877F2" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Facebook Pages</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {facebookConnected ? "Connected successfully." : "Not connected."}
                </p>
              </div>
            </div>
            {facebookConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.5rem' 
                }}>
                  <CheckCircle size={16} /> Connected
                </span>
                <button 
                  onClick={() => window.location.href = getAuthUrl('facebook')}
                  title="Reconnect to Meta"
                  style={{
                    background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => handleDisconnect('facebook')}
                  title="Disconnect Meta"
                  style={{
                    background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = getAuthUrl('facebook')}
                style={{
                  background: '#1877f2', color: 'white', border: 'none', 
                  padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Connect Facebook
              </button>
            )}
          </div>

          {/* Twitter (X) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(29, 161, 242, 0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <Twitter size={24} color="#1DA1F2" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Twitter / X</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {twitterConnected ? "Connected successfully." : "Not connected."}
                </p>
              </div>
            </div>
            {twitterConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.5rem' 
                }}>
                  <CheckCircle size={16} /> Connected
                </span>
                <button 
                  onClick={() => window.location.href = getAuthUrl('twitter')}
                  title="Reconnect to Twitter/X"
                  style={{
                    background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => handleDisconnect('twitter')}
                  title="Disconnect Twitter/X"
                  style={{
                    background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = getAuthUrl('twitter')}
                style={{
                  background: '#1da1f2', color: 'white', border: 'none', 
                  padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Connect Twitter
              </button>
            )}
          </div>

          {/* LinkedIn */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(10, 102, 194, 0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <Linkedin size={24} color="#0077b5" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>LinkedIn</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {linkedinConnected ? "Connected successfully." : "Not connected."}
                </p>
              </div>
            </div>
            {linkedinConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.5rem' 
                }}>
                  <CheckCircle size={16} /> Connected
                </span>
                <button 
                  onClick={() => window.location.href = getAuthUrl('linkedin')}
                  title="Reconnect to LinkedIn"
                  style={{
                    background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => handleDisconnect('linkedin')}
                  title="Disconnect LinkedIn"
                  style={{
                    background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = getAuthUrl('linkedin')}
                style={{
                  background: '#0077b5', color: 'white', border: 'none', 
                  padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Connect LinkedIn
              </button>
            )}
          </div>

          {/* Pinterest */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(230, 0, 35, 0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                {/* Fallback to Link icon since Lucide might not have Pinterest imported yet if we don't change imports, wait I can just import it if available, or just use Link2. Let me use Link2 for now to avoid crashing if lucide-react doesn't have Pinterest */}
                <span style={{ fontSize: '24px', color: '#E60023', fontWeight: 'bold' }}>P</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pinterest</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {pinterestConnected ? "Connected successfully." : "Not connected."}
                </p>
              </div>
            </div>
            {pinterestConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.5rem' 
                }}>
                  <CheckCircle size={16} /> Connected
                </span>
                <button 
                  onClick={() => window.location.href = getAuthUrl('pinterest')}
                  title="Reconnect to Pinterest"
                  style={{
                    background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => handleDisconnect('pinterest')}
                  title="Disconnect Pinterest"
                  style={{
                    background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = getAuthUrl('pinterest')}
                style={{
                  background: '#e60023', color: 'white', border: 'none', 
                  padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Connect Pinterest
              </button>
            )}
          </div>

          {/* Snapchat */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 252, 0, 0.2)', padding: '0.75rem', borderRadius: '50%' }}>
                <Ghost size={24} color="#cca300" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Snapchat</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {snapchatConnected ? "Connected successfully." : "Not connected."}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '6px', maxWidth: '350px', lineHeight: 1.4 }}>
                  ⚠️ <strong>API Warning:</strong> Snapchat structurally restricts automated video publishing exclusively to Verified Business Public Profiles. Personal accounts are officially blocked and natively rejected by their API.
                </div>
              </div>
            </div>
            {snapchatConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.5rem' 
                }}>
                  <CheckCircle size={16} /> Connected
                </span>
                <button 
                  onClick={() => window.location.href = getAuthUrl('snapchat')}
                  title="Reconnect to Snapchat"
                  style={{
                    background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => handleDisconnect('snapchat')}
                  title="Disconnect Snapchat"
                  style={{
                    background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
               <button 
                onClick={() => window.location.href = getAuthUrl('snapchat')}
                style={{
                  background: '#FFFC00', color: 'black', border: 'none', 
                  padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Connect Snapchat
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
