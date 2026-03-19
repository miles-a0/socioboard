import React from 'react';
import { Facebook, Twitter, Linkedin, Ghost, Heart, MessageCircle, Share2, Repeat2, BarChart2 } from 'lucide-react';

interface PostPreviewProps {
  platform: string;
  content: string;
  mediaUrls: string[];
  mediaTypes?: ('image' | 'video')[];
  userName?: string;
}

const PostPreview: React.FC<PostPreviewProps> = ({ platform, content, mediaUrls, mediaTypes, userName = "SocioBoard User" }) => {
  const renderMedia = () => {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    
    // Mock grid setup since we don't have tailwind grid
    return (
      <div style={{ display: 'grid', gridTemplateColumns: mediaUrls.length > 1 ? '1fr 1fr' : '1fr', gap: '4px', marginTop: '12px', borderRadius: '12px', overflow: 'hidden' }}>
        {mediaUrls.slice(0, 4).map((url, i) => {
          let isVideo = false;
          if (mediaTypes && mediaTypes[i]) {
            isVideo = mediaTypes[i] === 'video';
          } else {
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('video') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov')) {
               isVideo = true;
            }
          }

          return (
            <div key={i} style={{ position: 'relative', paddingTop: '100%', gridColumn: (mediaUrls.length === 3 && i === 0) ? 'span 2' : 'auto' }}>
              {isVideo ? (
                <video src={url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', background: 'black' }} controls />
              ) : (
                <img src={url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#f3f4f6' }} alt="Preview element" />
              )}
              {mediaUrls.length > 4 && i === 3 && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  +{mediaUrls.length - 4}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFacebook = () => (
    <div style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', margin: '0 auto', maxWidth: '400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Facebook size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{userName}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>Just now • 🌍</div>
        </div>
      </div>
      <div style={{ fontSize: '15px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{content || "What's on your mind?"}</div>
      {renderMedia()}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Heart size={16}/> Like</div>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><MessageCircle size={16}/> Comment</div>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Share2 size={16}/> Share</div>
      </div>
    </div>
  );

  const renderTwitter = () => (
    <div style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', margin: '0 auto', maxWidth: '400px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1DA1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Twitter size={24} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
             <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</span>
             <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{userName.replace(/\s+/g, '').toLowerCase()}</span>
             <span style={{ color: 'var(--text-secondary)' }}>· 1m</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '15px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{content || "What's happening?"}</div>
          {renderMedia()}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingRight: '20px' }}>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><MessageCircle size={16}/></span>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Repeat2 size={16}/></span>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={16}/></span>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><BarChart2 size={16}/></span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLinkedIn = () => (
    <div style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', overflow: 'hidden', margin: '0 auto', maxWidth: '400px' }}>
      <div style={{ padding: '16px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
            <Linkedin size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{userName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Socioboard Connector</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Just now • 🌐</div>
          </div>
        </div>
        <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{content || "What do you want to talk about?"}</div>
      </div>
      {renderMedia()}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, background: 'var(--bg-input)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><Heart size={16}/> Like</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><MessageCircle size={16}/> Comment</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><Share2 size={16}/> Share</div>
      </div>
    </div>
  );

  const renderDefault = () => (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', margin: '0 auto', maxWidth: '400px' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
         <Ghost size={20}/>
         <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>{platform} Preview</span>
       </div>
       <div style={{ whiteSpace: 'pre-wrap', fontSize: '15px', opacity: 0.9 }}>{content || "Drafting memory..."}</div>
       {renderMedia()}
    </div>
  );

  if (platform === 'Facebook') return renderFacebook();
  if (platform === 'Twitter') return renderTwitter();
  if (platform === 'LinkedIn') return renderLinkedIn();
  
  return renderDefault();
};

export default React.memo(PostPreview);
