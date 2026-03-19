import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Facebook, Twitter, Linkedin, Share2, Loader } from 'lucide-react';
import api from '../services/api';

// Reusing Post Interface
interface Post {
  id: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: string;
  media_urls: string[];
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch posts on mount / month change
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/posts');
        setPosts(response.data);
      } catch (err) {
        console.error("Failed to fetch posts for calendar", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  // 2. Date Math Helpers
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const today = new Date();

  // Calculate days in month and padding
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
  
  // Create grid arrays
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 3. Render Helpers
  const renderPlatformIcon = (platform: string, size = 12) => {
    switch (platform) {
      case 'Facebook': return <Facebook size={size} color="#1877F2" />;
      case 'Twitter': return <Twitter size={size} color="#1DA1F2" />;
      case 'LinkedIn': return <Linkedin size={size} color="#0A66C2" />;
      case 'Pinterest': return <Share2 size={size} color="#E60023" />;
      default: return <CalendarIcon size={size} color="var(--primary-color)" />;
    }
  };

  const getPlatformBg = (platform: string) => {
    switch (platform) {
      case 'Facebook': return 'rgba(24, 119, 242, 0.15)';
      case 'Twitter': return 'rgba(29, 161, 242, 0.15)';
      case 'LinkedIn': return 'rgba(10, 102, 194, 0.15)';
      case 'Pinterest': return 'rgba(230, 0, 35, 0.15)';
      default: return 'var(--bg-input)';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin" size={32} color="var(--primary-color)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Content Calendar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visualize and manage your entire cross-platform strategy.</p>
        </div>
        
        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--glass-bg)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--glass-border)' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, minWidth: '130px', textAlign: 'center' }}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Grid Canvas */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Day Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', 
          gap: '0.5rem', flex: 1, minHeight: '500px'
        }}>
          
          {/* Empty prefix padding days */}
          {blanks.map(blank => (
             <div key={`blank-${blank}`} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-sm)' }} />
          ))}

          {/* Active Days */}
          {days.map(day => {
            // Find posts that land specifically on this calendar day cell
            const dayPosts = posts.filter(post => {
              const postDate = new Date(post.scheduled_time);
              return postDate.getDate() === day &&
                     postDate.getMonth() === currentDate.getMonth() &&
                     postDate.getFullYear() === currentDate.getFullYear();
            });

            const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

            return (
              <div 
                key={day} 
                className="calendar-day"
                style={{
                  background: isToday ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-input)', // Highlight today
                  border: isToday ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  overflowY: 'auto', // For days with heavy post loads
                  transition: 'all 0.2s'
                }}
              >
                {/* Number Plate */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    background: isToday ? 'var(--primary-color)' : 'transparent',
                    color: isToday ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '0.875rem'
                  }}>
                    {day}
                  </span>
                </div>

                {/* Posts UI rendering sequence */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {dayPosts.map(post => (
                    <div 
                      key={post.id}
                      style={{
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        background: getPlatformBg(post.platform),
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer'
                      }}
                      title={post.content}
                    >
                      {renderPlatformIcon(post.platform)}
                      <span style={{ 
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
                        color: 'var(--text-primary)', fontWeight: 500, flex: 1 
                      }}>
                        {new Date(post.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
