import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Trash2, Loader, Copy, CheckCircle2, Wand2, X } from 'lucide-react';
import api from '../services/api';

interface MediaAsset {
  filename: string;
  url: string;
  size_mb: number;
  type: 'image' | 'video';
}

const MediaLibrary: React.FC = () => {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeAiAsset, setActiveAiAsset] = useState<MediaAsset | null>(null);
  const [aiCaption, setAiCaption] = useState<string>('');

  const fetchMedia = async () => {
    try {
      const response = await api.get('/media');
      setMedia(response.data);
    } catch (err) {
      console.error("Failed to fetch media library", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleGenerateAI = async (asset: MediaAsset) => {
    setActiveAiAsset(asset);
    setAiGenerating(true);
    setAiCaption('');
    try {
      const response = await api.post('/ai/generate', {
        topic: 'A compelling social media post featuring this image',
        platform: 'Instagram',
        image_url: asset.type === 'image' ? asset.url : undefined
      });
      setAiCaption(response.data.caption);
    } catch (err) {
      console.error("Failed to analyze media", err);
      setAiCaption("Failed to analyze image. Please ensure your configuration is authenticated.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this asset?")) return;
    
    try {
      await api.delete(`/media/${filename}`);
      setMedia(prev => prev.filter(m => m.filename !== filename));
    } catch (err) {
      console.error("Failed to delete media.", err);
      alert("Failed to delete asset.");
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin" size={32} color="var(--primary-color)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading your asset vault...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ paddingBottom: '2rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ImageIcon color="var(--primary-color)" /> Media Assets Vault
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Centralized storage for your global brand imagery, videos, and post attachments.</p>
      </header>

      {media.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'var(--glass-bg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1.5rem',
            border: '1px solid var(--glass-border)'
          }}>
            <ImageIcon size={48} color="rgba(255,255,255,0.1)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Your Vault is Empty</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Upload media via the Post Composer, and they will permanently archive here for reuse.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {media.map((asset) => (
            <div key={asset.filename} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                height: '200px', 
                background: 'var(--bg-body)', 
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {asset.type === 'video' ? (
                  <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls controlsList="nodownload" />
                ) : (
                  <img src={asset.url} alt="User Asset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{
                  position: 'absolute', top: '0.5rem', left: '0.5rem',
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  padding: '0.25rem 0.5rem', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  {asset.type === 'video' ? <Video size={14} color="#f59e0b" /> : <ImageIcon size={14} color="var(--primary-color)" />}
                  {asset.size_mb} MB
                </div>
                {asset.type === 'image' && (
                  <button
                    onClick={() => handleGenerateAI(asset)}
                    style={{
                      position: 'absolute', top: '0.5rem', right: '0.5rem',
                      background: 'rgba(99, 102, 241, 0.9)', backdropFilter: 'blur(4px)', color: 'white',
                      border: 'none', padding: '0.35rem 0.6rem', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Wand2 size={12} /> Analyze
                  </button>
                )}
              </div>
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                  {asset.filename.substring(0, 30)}...
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCopyUrl(asset.url)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px',
                      cursor: 'pointer', fontSize: '0.875rem', transition: 'all var(--transition-fast)'
                    }}
                  >
                    {copiedUrl === asset.url ? <><CheckCircle2 size={16} color="#10b981" /> Copied!</> : <><Copy size={16} /> Copy URL</>}
                  </button>
                  <button
                    onClick={() => handleDelete(asset.filename)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444', padding: '0.5rem', borderRadius: '4px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Delete Asset"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Intelligence Modal Overlays */}
      {activeAiAsset && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-fade-in-up" style={{ 
            width: '100%', maxWidth: '600px', padding: '2rem', 
            position: 'relative', border: '1px solid var(--primary-color)' 
          }}>
            <button
              onClick={() => setActiveAiAsset(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.5rem', borderRadius: '8px' }}><Wand2 color="var(--primary-color)" /></div>
              <h2 style={{ fontSize: '1.5rem' }}>AI Vision Insights</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <img src={activeAiAsset.url} alt="Analyzing" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Visual telemetry analysis running via <strong>gpt-4o-mini</strong>...</p>
                {aiGenerating ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', padding: '1rem', background: 'var(--bg-input)', borderRadius: '8px' }}>
                    <Loader className="animate-spin" size={18} /> Deep scanning pixel array...
                  </div>
                ) : (
                  <div style={{ 
                    background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', 
                    color: 'white', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                    border: '1px solid var(--border-color)'
                  }}>
                    {aiCaption}
                  </div>
                )}
              </div>
            </div>

            {!aiGenerating && aiCaption && (
              <button
                onClick={() => { navigator.clipboard.writeText(aiCaption); alert("Copied to clipboard!"); }}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <Copy size={18} /> Copy Insights to Clipboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
