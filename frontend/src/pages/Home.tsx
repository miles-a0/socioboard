import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Users, Zap } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="container animate-fade-in-up">
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '6rem 0 4rem',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 1rem',
          borderRadius: '9999px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          color: 'var(--accent-color)',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          letterSpacing: '0.05em'
        }}>
          VERSION 2.0 IS HERE
        </div>
        
        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
          Manage your social <br />
          <span className="text-gradient">presence everywhere.</span>
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-secondary)',
          marginBottom: '2.5rem',
          lineHeight: 1.6
        }}>
          The ultimate platform to schedule, track, and amplify your content across all networks.
          Built for modern creators and teams.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/signup" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
            Get Started Free
            <ArrowRight size={20} />
          </Link>
          <a href="#features" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
            View Features
          </a>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" style={{ padding: '4rem 0' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '3rem' }}>Why choose Socioboard?</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          {/* Feature 1 */}
          <div className="glass-panel delay-100 animate-fade-in-up" style={{ padding: '2rem' }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: 'var(--border-radius-md)',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Zap size={24} color="var(--primary-color)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Lightning Fast</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Schedule posts across multiple platforms instantly. Our optimized infrastructure ensures your content goes live right on time.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel delay-200 animate-fade-in-up" style={{ padding: '2rem' }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: 'var(--border-radius-md)',
              background: 'rgba(236, 72, 153, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <BarChart3 size={24} color="var(--secondary-color)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Deep Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Understand your audience with detailed metrics and engaging visualizations that turn data into actionable insights.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel delay-300 animate-fade-in-up" style={{ padding: '2rem' }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: 'var(--border-radius-md)',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Users size={24} color="var(--accent-color)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Team Collaboration</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Work perfectly in sync. Assign roles, share drafts, and approve posts with seamless team workflows.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
