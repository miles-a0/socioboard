import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Activity, Users, Eye, TrendingUp, Loader, Target, Share2, MousePointerClick, Sparkles } from 'lucide-react';
import api from '../services/api';

// Reusing types from Dashboard
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

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics/summary');
        setData(response.data);
        
        if (response.data && response.data.history && response.data.history.length > 0) {
          fetchAiInsight(response.data.history);
        }
      } catch (err) {
        console.error("Failed to fetch deeper analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const fetchAiInsight = async (historyData: any[]) => {
    setInsightLoading(true);
    try {
      const res = await api.post('/ai/analytics-insight', { history: historyData });
      if (res.data && res.data.insight) {
        setAiInsight(res.data.insight);
      }
    } catch (err) {
      console.error("Failed to fetch AI insight", err);
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin" size={32} color="var(--primary-color)" />
        <p style={{ color: 'var(--text-secondary)' }}>Compiling your historical data...</p>
      </div>
    );
  }

  if (!data || !data.history.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No analytics data is currently available.</p>
      </div>
    );
  }

  // Formatting date maps for Recharts
  const chartData = data.history.map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    followers: item.total_followers,
    engagement: item.engagement_rate,
    impressions: item.profile_views,
    posts: item.active_posts
  }));

  // Generic Beautiful Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, display: 'inline-block' }}></span>
              {entry.name}: {entry.value.toLocaleString()} {entry.name === 'engagement' ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const keyMetrics = [
    { title: 'Goal Completion Rate', value: '68%', icon: <Target size={24} color="var(--primary-color)" /> },
    { title: 'Link Clicks', value: '4,209', icon: <MousePointerClick size={24} color="#f59e0b" /> },
    { title: 'Audience Shares', value: '842', icon: <Share2 size={24} color="#10b981" /> }
  ];

  return (
    <div className="animate-fade-in-up" style={{ paddingBottom: '2rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity color="var(--primary-color)" /> Analytics Deep Dive
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Explore your audience growth, engagement metrics, and historical impact over time.</p>
      </header>

      {/* AI Strategic Insights Block */}
      <div className="glass-panel" style={{ 
        padding: '1.5rem', marginBottom: '2.5rem', borderLeft: '4px solid var(--primary-color)',
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={18} color="var(--primary-color)" />
          <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'var(--primary-color)' }}>AI Strategic Insights</h2>
        </div>
        {insightLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <Loader size={16} className="animate-spin" /> Analyzing growth curves and audience telemetry...
          </div>
        ) : (
          <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {aiInsight || "Keep posting consistently to maintain your audience growth. Experiment with new content formats to boost engagement."}
          </p>
        )}
      </div>

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {keyMetrics.map((kpi, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '50%' }}>
              {kpi.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{kpi.title}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Growth & Impressions Line Chart */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--primary-color)" /> Audience & Reach
          </h2>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{fontSize: 12}} tickLine={false} axisLine={false} dx={-10} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{fontSize: 12}} tickLine={false} axisLine={false} dx={10} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area yAxisId="right" type="monotone" dataKey="followers" name="Total Followers" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowers)" />
                <Area yAxisId="left" type="monotone" dataKey="impressions" name="Impressions" stroke="var(--accent-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorImpressions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Layout Grid for smaller charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
          
          {/* Engagement Rate Bar Chart */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#10b981" /> Engagement Rate
            </h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11}} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="engagement" name="Engagement %" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Posts Line Chart */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={20} color="#f59e0b" /> Daily Posting Velocity
            </h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11}} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="stepAfter" dataKey="posts" name="Active Posts" stroke="#f59e0b" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: 'var(--bg-body)' }} activeDot={{ r: 6, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default Analytics;
