import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Eye, Activity, Loader } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';

// Types
interface AnalyticsStat {
  id: number;
  user_id: number;
  date: string;
  total_followers: number;
  engagement_rate: number;
  active_posts: number;
  profile_views: number;
}

interface AnalyticsSummary {
  current: AnalyticsStat;
  history: AnalyticsStat[];
}

interface ActivityPost {
  id: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [activities, setActivities] = useState<ActivityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, activityRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/activity')
        ]);
        setData(analyticsRes.data);
        setActivities(activityRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin" size={32} color="var(--primary-color)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No analytics data available right now.</p>
      </div>
    );
  }

  const current = data.current;
  
  // Custom tool to calculate trend logic simply
  const calcTrend = (currentVal: number, key: keyof AnalyticsStat) => {
    if (data.history.length < 2) return "+0.0%";
    const prev = data.history[data.history.length - 2][key] as number;
    if (prev === 0) return "+100%";
    const diff = currentVal - prev;
    const pct = (diff / prev) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const metrics = [
    { title: 'Connected Networks', value: current.total_followers.toLocaleString(), change: calcTrend(current.total_followers, 'total_followers'), isPositive: true, icon: <Users size={24} color="var(--primary-color)" />, bg: 'rgba(99, 102, 241, 0.1)' },
    { title: 'Published Posts', value: current.engagement_rate.toLocaleString(), change: calcTrend(current.engagement_rate, 'engagement_rate'), isPositive: true, icon: <Activity size={24} color="var(--secondary-color)" />, bg: 'rgba(236, 72, 153, 0.1)' },
    { title: 'Vault Media Items', value: current.profile_views.toLocaleString(), change: calcTrend(current.profile_views, 'profile_views'), isPositive: current.profile_views > 0, icon: <Eye size={24} color="var(--accent-color)" />, bg: 'rgba(6, 182, 212, 0.1)' },
    { title: 'Scheduled Posts', value: current.active_posts.toString(), change: calcTrend(current.active_posts, 'active_posts'), isPositive: true, icon: <TrendingUp size={24} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.1)' },
  ];

  const chartData = data.history.map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    published: item.engagement_rate,
    scheduled: item.active_posts
  }));

  // Recharts Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{label}</p>
          <p style={{ color: 'var(--primary-color)' }}>Published: {payload[0].value.toLocaleString()}</p>
          <p style={{ color: 'var(--accent-color)' }}>Scheduled: {payload[1].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in-up">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back! Here's what's happening with your accounts today.</p>
        </div>
        <Link to="/dashboard/posts" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
          Create Post
        </Link>
      </header>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {metrics.map((metric, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: 'var(--border-radius-sm)',
                background: metric.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {metric.icon}
              </div>
              <span style={{
                fontSize: '0.875rem', fontWeight: 600,
                color: metric.isPositive ? '#10b981' : '#ef4444',
                background: metric.isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                padding: '0.25rem 0.5rem', borderRadius: '4px'
              }}>
                {metric.change}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{metric.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{metric.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area: Charts & Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Publishing Output Timeline</h2>
          <div style={{ width: '100%' }}>
            <ResponsiveContainer width="99%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="published" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorPublished)" />
                <Area type="monotone" dataKey="scheduled" stroke="var(--accent-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorScheduled)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', overflowY: 'auto', maxHeight: '450px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activities.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No recent activity to display.</p>
            ) : (
              activities.map((activity, idx) => {
                // Calculate relative time like "2 hours ago"
                const diffMs = new Date().getTime() - new Date(activity.scheduled_time).getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                let relTime = '';
                if (diffDays > 0) relTime = `${diffDays}d ago`;
                else if (diffHours > 0) relTime = `${diffHours}h ago`;
                else relTime = diffMins > 0 ? `${diffMins}m ago` : 'Just now';

                return (
                  <div key={activity.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    paddingBottom: '1rem', borderBottom: idx !== activities.length - 1 ? '1px solid var(--glass-border)' : 'none'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)', marginTop: '6px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Your post to <strong style={{color: 'var(--text-primary)'}}>{activity.platform}</strong> was published successfully.
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {relTime}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
