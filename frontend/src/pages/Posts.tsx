import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Facebook, Trash2, Clock, Loader, Image as ImageIcon, X, Twitter, Linkedin, Share2, Edit2, Wand2, Ghost } from 'lucide-react';
import api from '../services/api';
import PostPreview from '../components/PostPreview';

interface Post {
  id: string; // Keeping as string based on original code, not number as in instruction snippet
  account_id?: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: string;
  media_urls: string[];
}

interface PlatformConstraints {
  maxChars: number;
  maxImages: number;
  maxVideos: number;
  maxImageSizeMB: number;
  maxVideoSizeMB: number;
  mixedMediaAllowed: boolean;
}

const PLATFORM_LIMITS: Record<string, PlatformConstraints> = {
  'Facebook': {
    maxChars: 63206,
    maxImages: 10,
    maxVideos: 10,
    maxImageSizeMB: 30,
    maxVideoSizeMB: 10240, // 10GB
    mixedMediaAllowed: true
  },
  'Twitter': {
    maxChars: 280,
    maxImages: 4,
    maxVideos: 1,
    maxImageSizeMB: 5,
    maxVideoSizeMB: 512,
    mixedMediaAllowed: false // Twitter doesn't allow mixing photos and GIFs/Videos in same post
  },
  'LinkedIn': {
    maxChars: 3000,
    maxImages: 9,
    maxVideos: 1,
    maxImageSizeMB: 5,
    maxVideoSizeMB: 5120, // 5GB
    mixedMediaAllowed: false
  },
  'Pinterest': {
    maxChars: 500,
    maxImages: 1,
    maxVideos: 1,
    maxImageSizeMB: 20,
    maxVideoSizeMB: 2048, // 2GB
    mixedMediaAllowed: false
  },
  'Snapchat': {
    maxChars: 500,
    maxImages: 1,
    maxVideos: 1,
    maxImageSizeMB: 5,
    maxVideoSizeMB: 1024, // 1GB
    mixedMediaAllowed: false
  }
};

const Posts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const getLocalISOTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [scheduledTime, setScheduledTime] = useState(getLocalISOTime);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [selectedPlatform, setSelectedPlatform] = useState('Facebook');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Bulk Upload State
  const [activeTab, setActiveTab] = useState<'compose' | 'bulk'>('compose');
  const [feedTab, setFeedTab] = useState<'scheduled' | 'draft'>('scheduled');
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // AI State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Derive current constraints
  const currentLimits = PLATFORM_LIMITS[selectedPlatform];
  const charCount = content.length;
  const isOverCharLimit = charCount > currentLimits.maxChars;

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts');
      setPosts(response.data);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await api.get('/users/me/connections');
      setSocialAccounts(response.data);
    } catch (err) {
      console.error("Failed to fetch connections", err);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const response = await api.post('/ai/generate', {
        topic: aiTopic,
        platform: selectedPlatform
      });
      setContent(response.data.caption);
      setShowAiPrompt(false);
      setAiTopic('');
    } catch (err) {
      console.error("Failed to generate AI caption", err);
      setErrorMsg("Failed to contact the AI Assistant.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleEnhanceAI = async () => {
    if (!content.trim()) return;
    setAiEnhancing(true);
    try {
      const res = await api.post('/ai/enhance', { content, platform: selectedPlatform });
      setContent(res.data.enhanced_content);
    } catch (err) {
      console.error("Failed to enhance post", err);
      setErrorMsg("Failed to enhance post with AI.");
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvFile) {
      setErrorMsg('Please select a CSV file to upload.');
      return;
    }
    setBulkSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', bulkCsvFile);
      const limitObj = JSON.stringify(PLATFORM_LIMITS);
      formData.append('limits', limitObj); // Pass client-side limits to standardise backend logic
      
      const res = await api.post('/posts/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setBulkCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = '';
      alert(`Successfully scheduled ${res.data.scheduled_count} posts from CSV!`);
      await fetchPosts();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to process bulk CSV file.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchConnections();
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Intentionally removed the global useEffect for URL.revokeObjectURL
  // React 18 Strict Mode triggers unmount/remount cycles that instantly destroyed the Blob URLs
  // before the HTML5 Video decoder could asynchronously fetch their metadata.

  // Auto-select first account for the currently active platform
  useEffect(() => {
    const accountsForPlatform = socialAccounts.filter(
      a => a.provider.toLowerCase() === selectedPlatform.toLowerCase()
    );
    if (accountsForPlatform.length > 0) {
      if (!selectedAccount || selectedAccount.provider.toLowerCase() !== selectedPlatform.toLowerCase()) {
        setSelectedAccount(accountsForPlatform[0]);
      }
    } else {
      setSelectedAccount(null);
    }
  }, [socialAccounts, selectedPlatform, selectedAccount]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incomingFiles = Array.from(e.target.files);
      const newMediaFiles: File[] = [];
      const newPreviewUrls: string[] = [];
      let currentImageCount = mediaFiles.filter(f => f.type.startsWith('image/')).length;
      let currentVideoCount = mediaFiles.filter(f => f.type.startsWith('video/')).length;
      let hasImages = currentImageCount > 0;
      let hasVideos = currentVideoCount > 0;

      setErrorMsg(''); // Clear previous errors

      for (const file of incomingFiles) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const fileSizeMB = file.size / (1024 * 1024);

        if (!isImage && !isVideo) {
          setErrorMsg(`File type not supported: ${file.name}. Only images and videos are allowed.`);
          continue;
        }

        // Check mixed media constraints
        if (!currentLimits.mixedMediaAllowed) {
          if ((hasImages && isVideo) || (hasVideos && isImage)) {
            setErrorMsg(`Cannot mix images and videos on ${selectedPlatform}.`);
            continue;
          }
        }

        // Check limits
        if (isImage) {
          if (currentImageCount >= currentLimits.maxImages) {
            setErrorMsg(`Maximum of ${currentLimits.maxImages} images allowed for ${selectedPlatform}.`);
            continue;
          }
          if (fileSizeMB > currentLimits.maxImageSizeMB) {
            setErrorMsg(`Image ${file.name} exceeds maximum size of ${currentLimits.maxImageSizeMB}MB for ${selectedPlatform}.`);
            continue;
          }
          currentImageCount++;
          hasImages = true;
        } else if (isVideo) {
          if (currentVideoCount >= currentLimits.maxVideos) {
            setErrorMsg(`Maximum of ${currentLimits.maxVideos} videos allowed for ${selectedPlatform}.`);
            continue;
          }
          if (fileSizeMB > currentLimits.maxVideoSizeMB) {
            setErrorMsg(`Video ${file.name} exceeds maximum size of ${currentLimits.maxVideoSizeMB}MB for ${selectedPlatform}.`);
            continue;
          }
          currentVideoCount++;
          hasVideos = true;
        }

        newMediaFiles.push(file);
        newPreviewUrls.push(URL.createObjectURL(file));
      }

      setMediaFiles(prev => [...prev, ...newMediaFiles]);
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
      
      // Clear the input value to allow the same file to be selected again later
      e.target.value = '';
    }
  };

  const removeMedia = (index: number) => {
    const urlToRevoke = previewUrls[index];
    if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRevoke);
    }
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(''); // Clear error if media is removed
  };

  const handleEditClick = (post: Post) => {
    setEditingPostId(post.id);
    setContent(post.content);
    setSelectedPlatform(post.platform);
    
    // Format the date string safely for the datetime-local input
    try {
      if (post.scheduled_time) {
        const dateObj = new Date(post.scheduled_time);
        if (!isNaN(dateObj.getTime())) {
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const localIso = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
          setScheduledTime(localIso);
        } else {
          setScheduledTime('');
        }
      }
    } catch (e) {
      console.error("Failed to parse existing date:", e);
      setScheduledTime('');
    }

    // Load existing URLs as previews. We won't try to reconstruct the File objects. 
    // They will be passed as is unless the user clears the entire previewUrls array.
    setPreviewUrls(post.media_urls || []);
    setMediaFiles([]); // Reset new uploads memory
    
    // The main scroll container in the Dashboard Layout is the <main> element, not the window.
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0 && previewUrls.length === 0) {
      setErrorMsg('You must provide either text content or media attachments.');
      return;
    }
    if (!scheduledTime) {
      setErrorMsg('Scheduled time is required.');
      return;
    }
    if (isOverCharLimit) {
      setErrorMsg(`Your post exceeds the maximum character limit for ${selectedPlatform}.`);
      return;
    }
    if (mediaFiles.length > 0) {
      const currentImageCount = mediaFiles.filter(f => f.type.startsWith('image/')).length;
      const currentVideoCount = mediaFiles.filter(f => f.type.startsWith('video/')).length;
      if (currentImageCount > currentLimits.maxImages || currentVideoCount > currentLimits.maxVideos) {
        setErrorMsg(`You have too many media files for ${selectedPlatform}. Please remove some.`);
        return;
      }
      if (!currentLimits.mixedMediaAllowed && currentImageCount > 0 && currentVideoCount > 0) {
        setErrorMsg(`Cannot mix images and videos on ${selectedPlatform}.`);
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      setUploadProgress(0);
      // 1. Upload new media files natively via form data
      const newlyUploadedUrls: string[] = [];
      for (const file of mediaFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        });
        newlyUploadedUrls.push(res.data.url);
      }

      // Combine existing un-removed media with new ones natively
      // If a preview URL begins with 'blob:', it's a new upload and we ignore it because it's in newlyUploadedUrls
      const existingRetainedUrls = previewUrls.filter(url => !url.startsWith('blob:'));
      const combinedMediaUrls = [...existingRetainedUrls, ...newlyUploadedUrls];

      const payload = {
        content,
        scheduled_time: new Date(scheduledTime).toISOString(),
        platform: selectedPlatform,
        media_urls: combinedMediaUrls,
        account_id: selectedAccount?.provider_account_id
      };

      if (editingPostId) {
        // 2B. Transmit the mapped update payload to MongoDB
        console.log("Sending PUT request for editing:", editingPostId, payload);
        const updateRes = await api.put(`/posts/${editingPostId}`, payload);
        console.log("Response from PUT:", updateRes.data);
      } else {
        // 2A. Transmit the master Post object to MongoDB
        await api.post('/posts', payload);
      }
      
      // Reset Form State
      setContent('');
      setMediaFiles([]);
      setEditingPostId(null);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await fetchPosts();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Upload Error: ${err.message}. ${err.response?.data?.detail || '(It is highly likely Ngrok blocked this video because its file size is too large for your internet connection or Ngrok limit)'}`);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDraftPost = async () => {
    if (!content.trim() && mediaFiles.length === 0 && previewUrls.length === 0) {
      setErrorMsg('You must provide either text content or media attachments to save a draft.');
      return;
    }
    if (isOverCharLimit) {
      setErrorMsg(`Your draft exceeds the maximum character limit for ${selectedPlatform}.`);
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      setUploadProgress(0);
      const newlyUploadedUrls: string[] = [];
      for (const file of mediaFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        });
        newlyUploadedUrls.push(res.data.url);
      }
      const existingRetainedUrls = previewUrls.filter(url => !url.startsWith('blob:'));
      const combinedMediaUrls = [...existingRetainedUrls, ...newlyUploadedUrls];

      const payload = {
        content,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        platform: selectedPlatform,
        media_urls: combinedMediaUrls,
        account_id: selectedAccount?.provider_account_id,
        status: 'draft'
      };

      if (editingPostId) {
        await api.put(`/posts/${editingPostId}`, payload);
      } else {
        await api.post('/posts', payload);
      }
      
      setContent('');
      setScheduledTime('');
      setMediaFiles([]);
      setEditingPostId(null);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await fetchPosts();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to save draft.');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this scheduled post? This cannot be undone.")) return;
    
    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      
      // If we are currently editing the post we just deleted, cancel edit mode
      if (editingPostId === id) {
        setEditingPostId(null);
        setContent('');
        setPreviewUrls([]);
        setMediaFiles([]);
      }
    } catch (err) {
      console.error("Failed to delete post", err);
      setErrorMsg("Failed to delete post. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin" size={32} color="var(--primary-color)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading scheduled posts...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Posts & Scheduling</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Draft, schedule, and organize your social media content.</p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 350px) 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Create Post Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button 
              onClick={() => { setActiveTab('compose'); setErrorMsg(''); }}
              style={{
                background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                color: activeTab === 'compose' ? 'var(--primary-color)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'compose' ? '2px solid var(--primary-color)' : '2px solid transparent',
                fontWeight: activeTab === 'compose' ? 600 : 400,
                transition: 'all 0.2s', fontSize: '1rem'
              }}>
              <Edit2 size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Single Post
            </button>
            <button 
              onClick={() => { setActiveTab('bulk'); setErrorMsg(''); }}
              style={{
                background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                color: activeTab === 'bulk' ? 'var(--primary-color)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'bulk' ? '2px solid var(--primary-color)' : '2px solid transparent',
                fontWeight: activeTab === 'bulk' ? 600 : 400,
                transition: 'all 0.2s', fontSize: '1rem'
              }}>
              <CalendarIcon size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Bulk CSV
            </button>
          </div>

          {errorMsg && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem', 
              borderRadius: 'var(--border-radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem'
            }}>
              {errorMsg}
            </div>
          )}

          {activeTab === 'compose' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CalendarIcon size={24} color="var(--primary-color)" />
                  <h2 style={{ fontSize: '1.25rem' }}>
                    {editingPostId ? 'Edit Post' : 'Compose Post'}
                  </h2>
                </div>
                {editingPostId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingPostId(null);
                      setContent('');
                      setPreviewUrls([]);
                      setMediaFiles([]);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSchedulePost}>
                
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Select Platform</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { name: 'Facebook', icon: <Facebook size={18} />, color: '#1877F2' },
                      { name: 'Twitter', icon: <Twitter size={18} />, color: '#1DA1F2' },
                      { name: 'LinkedIn', icon: <Linkedin size={18} />, color: '#0A66C2' },
                      { name: 'Pinterest', icon: <Share2 size={18} />, color: '#E60023' },
                      { name: 'Snapchat', icon: <Ghost size={18} />, color: '#cca300' }
                    ].map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                            setSelectedPlatform(p.name);
                            setErrorMsg(''); // Clear errors when shuffling platforms to prevent stale alerts
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          padding: '0.6rem', borderRadius: 'var(--border-radius-sm)',
                          background: selectedPlatform === p.name ? `${p.color}20` : 'var(--bg-input)',
                          border: `1px solid ${selectedPlatform === p.name ? p.color : 'var(--border-color)'}`,
                          color: selectedPlatform === p.name ? p.color : 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.2s', fontWeight: selectedPlatform === p.name ? 600 : 400,
                          fontSize: '0.875rem'
                        }}
                      >
                        {React.cloneElement(p.icon as React.ReactElement<any>, { color: selectedPlatform === p.name ? p.color : 'currentColor' })}
                        {p.name}
                      </button>
                    ))}
                  </div>
                  
                  {/* Account Selection Dropdown */}
                  {socialAccounts.filter(a => a.provider.toLowerCase() === selectedPlatform.toLowerCase()).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Target Account</label>
                      <select
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'white', outline: 'none' }}
                        value={selectedAccount?.provider_account_id || ""}
                        onChange={(e) => {
                          const sel = socialAccounts.find(a => a.provider_account_id === e.target.value);
                          setSelectedAccount(sel || null);
                        }}
                      >
                        <option value="" disabled style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>-- Select a {selectedPlatform} Profile or Page --</option>
                        {socialAccounts
                          .filter(a => a.provider.toLowerCase() === selectedPlatform.toLowerCase())
                          .map((acc, i) => {
                            const providerFormatted = acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1);
                            return (
                              <option key={i} value={acc.provider_account_id} style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                                {acc.name || `${providerFormatted} Account`}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  )}
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <label>Post Content</label>
                  <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="What's on your mind? (Optional if attaching media)"
                    rows={5}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: isOverCharLimit ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      color: 'white',
                      padding: '1rem',
                      borderRadius: 'var(--border-radius-sm)',
                      resize: 'vertical',
                      marginBottom: '1rem'
                    }}
                  />
                  
                  {/* AI Assistant Toggle & Logic */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '0.75rem',
                    flexWrap: 'wrap',
                    gap: '1rem' 
                  }}>
                    {/* Left: Write with AI */}
                    <div>
                      {!showAiPrompt ? (
                        <button 
                          type="button" 
                          onClick={() => setShowAiPrompt(true)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.5rem', 
                            background: 'none', border: 'none', 
                            color: 'var(--primary-color)', cursor: 'pointer',
                            fontSize: '0.875rem', fontWeight: 500
                          }}
                        >
                          <Wand2 size={16} /> Write with AI
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-body)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)' }}>
                          <Wand2 size={16} color="var(--primary-color)" />
                          <input 
                            type="text" 
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === 'NumpadEnter' || e.keyCode === 13) && !aiGenerating && aiTopic.trim()) {
                                e.preventDefault();
                                handleGenerateAI();
                              }
                            }}
                            placeholder="E.g., A post about our new feature launch..."
                            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                            disabled={aiGenerating}
                          />
                          <button 
                            type="button" 
                            onClick={handleGenerateAI}
                            disabled={aiGenerating || !aiTopic.trim()}
                            style={{ 
                              background: 'var(--primary-color)', color: 'white', border: 'none', 
                              padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: aiGenerating ? 'not-allowed' : 'pointer',
                              fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem'
                            }}
                          >
                            {aiGenerating ? <><Loader size={12} className="animate-spin" /> Generating...</> : "Generate"}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setShowAiPrompt(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Optimize & Character Limit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={handleEnhanceAI}
                        disabled={aiEnhancing || !content.trim()}
                        style={{
                          background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79, 70, 229, 0.3)',
                          color: 'var(--primary-color)', padding: '0.3rem 0.75rem', borderRadius: '4px',
                          cursor: (aiEnhancing || !content.trim()) ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { if (!aiEnhancing && content.trim()) e.currentTarget.style.background = 'rgba(79, 70, 229, 0.25)' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(79, 70, 229, 0.15)' }}
                      >
                        {aiEnhancing ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        {aiEnhancing ? 'Optimizing...' : 'AI Optimize'}
                      </button>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        color: isOverCharLimit ? '#ef4444' : 'var(--text-secondary)',
                        background: 'var(--bg-body)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {charCount} <span style={{opacity: 0.5}}>/</span> {currentLimits.maxChars > 10000 ? `${Math.floor(currentLimits.maxChars/1000)}k` : currentLimits.maxChars}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  {/* Media Previews */}
                  {previewUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {previewUrls.map((url, i) => {
                        // During Edit mode, `mediaFiles` won't map 1:1 with `previewUrls` because the backend URLs are pre-populated
                        // but the native File objects are missing.
                        let isImage = true;
                        if (mediaFiles[i]) {
                          isImage = mediaFiles[i].type.startsWith('image/');
                        } else {
                          // fallback to URL extension check for remote media
                          const lowerUrl = url.toLowerCase();
                          isImage = !lowerUrl.endsWith('.mp4') && !lowerUrl.endsWith('.webm') && !lowerUrl.endsWith('.mov');
                        }

                        return (
                          <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '4px', overflow: 'hidden' }}>
                            {isImage ? (
                              <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} muted autoPlay loop playsInline controls={false} />
                            )}
                            <button 
                              type="button"
                              onClick={() => removeMedia(i)}
                            style={{
                              position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: 'white', 
                              border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}>
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Add Media Button */}
                  <div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,video/*" 
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', 
                        border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', 
                        borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)' }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      <ImageIcon size={18} />
                      Add Photo/Video
                    </button>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label>
                    Schedule Time ({currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </label>
                  <div 
                    className="calendar-wrapper"
                  >
                    <CalendarIcon size={20} color="var(--text-secondary)" />
                    <input 
                      type="datetime-local" 
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={getLocalISOTime()}
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        padding: '0.25rem',
                        outline: 'none',
                        position: 'relative',
                        zIndex: 2,
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>

                {uploadProgress !== null && (
                  <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Uploading Media...</span>
                      <span style={{ color: 'var(--primary-color)' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--glass-border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--primary-color)', width: `${uploadProgress}%`, transition: 'width 0.2s ease', borderRadius: '3px' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.875rem' }}
                    disabled={submitting || isOverCharLimit}
                  >
                    {submitting ? (editingPostId ? 'Updating...' : 'Scheduling...') : (editingPostId ? 'Update Post' : 'Schedule Post')}
                  </button>
                  <button 
                    type="button"
                    onClick={handleDraftPost}
                    style={{ 
                      flex: 1, padding: '0.875rem', background: 'var(--bg-input)', color: 'white', 
                      border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', 
                      cursor: submitting || isOverCharLimit ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      fontWeight: 500
                    }}
                    onMouseOver={(e) => { if (!submitting && !isOverCharLimit) e.currentTarget.style.borderColor = 'var(--text-secondary)' }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
                    disabled={submitting || isOverCharLimit}
                  >
                    Save as Draft
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <CalendarIcon size={24} color="var(--primary-color)" />
                <h2 style={{ fontSize: '1.25rem' }}>Bulk CSV Importer</h2>
              </div>
              
              <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Upload a CSV file containing hundreds of posts to automatically schedule them. 
                The required headers are: <strong>platform, content, scheduled_time, image_url</strong>.
                <div>
                  <a href="/bulk_template.csv" download style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>Download CSV Template</a>
                </div>
              </div>

              <form onSubmit={handleBulkUpload}>
                <div style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  background: 'var(--bg-input)',
                  marginBottom: '1.5rem',
                  transition: 'border-color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <input
                    type="file"
                    accept=".csv"
                    ref={csvInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setBulkCsvFile(e.target.files[0]);
                        setErrorMsg('');
                      }
                    }}
                    style={{ display: 'none' }}
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--bg-body)', padding: '1rem', borderRadius: '50%' }}>
                      <CalendarIcon size={32} color="var(--primary-color)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                        {bulkCsvFile ? bulkCsvFile.name : 'Click to Upload CSV'}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {bulkCsvFile ? `${(bulkCsvFile.size / 1024).toFixed(2)} KB` : 'or drag and drop your file here'}
                      </p>
                    </div>
                  </label>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.875rem' }}
                  disabled={bulkSubmitting || !bulkCsvFile}
                >
                  {bulkSubmitting ? 'Uploading & Processing CSV...' : 'Start Bulk Import'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Right Column: Preview + Scheduled Posts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Post Preview Component */}
          {activeTab === 'compose' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Live Preview</h2>
              <PostPreview 
                platform={selectedPlatform} 
                content={content} 
                mediaUrls={previewUrls}
                mediaTypes={previewUrls.map((url, i) => {
                  if (mediaFiles[i]) return mediaFiles[i].type.startsWith('video/') ? 'video' : 'image';
                  const lowerUrl = url.toLowerCase();
                  return (lowerUrl.includes('video') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov')) ? 'video' : 'image';
                })}
              />
            </div>
          )}

          {/* Posts List Layout Switcher */}
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button 
                onClick={() => setFeedTab('scheduled')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                  color: feedTab === 'scheduled' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  borderBottom: feedTab === 'scheduled' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  fontWeight: feedTab === 'scheduled' ? 600 : 400,
                  transition: 'all 0.2s', fontSize: '1.125rem'
                }}>
                Scheduled Content
              </button>
              <button 
                onClick={() => setFeedTab('draft')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                  color: feedTab === 'draft' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  borderBottom: feedTab === 'draft' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  fontWeight: feedTab === 'draft' ? 600 : 400,
                  transition: 'all 0.2s', fontSize: '1.125rem'
                }}>
                Drafts & Templates
              </button>
            </div>

          {posts.filter(p => feedTab === 'scheduled' ? p.status !== 'draft' : p.status === 'draft').length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'var(--glass-bg)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1.5rem',
                border: '1px solid var(--glass-border)'
              }}>
                <CalendarIcon size={48} color="rgba(255,255,255,0.1)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No {feedTab === 'scheduled' ? 'Scheduled Posts' : 'Drafts Found'}</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{feedTab === 'scheduled' ? 'Use the composer to draft your first post!' : 'Save your work-in-progress content to see it here.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posts.filter(p => feedTab === 'scheduled' ? p.status !== 'draft' : p.status === 'draft').map(post => {
                const date = post.scheduled_time ? new Date(post.scheduled_time) : null;
                
                // Get dynamic platform configs
                let pColor = '#1877F2';
                let pIcon = <Facebook size={16} />;
                if (post.platform === 'Twitter') { pColor = '#1DA1F2'; pIcon = <Twitter size={16} />; }
                if (post.platform === 'LinkedIn') { pColor = '#0A66C2'; pIcon = <Linkedin size={16} />; }
                if (post.platform === 'Pinterest') { pColor = '#E60023'; pIcon = <Share2 size={16} />; }
                if (post.platform === 'Snapchat') { pColor = '#cca300'; pIcon = <Ghost size={16} />; }

                return (
                  <div key={post.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                    
                    {/* Date/Time Block */}
                    <div style={{ 
                      minWidth: '80px', textAlign: 'center', borderRight: '1px solid var(--glass-border)', paddingRight: '1.5rem' 
                    }}>
                      {date ? (
                        <>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                            {date.getDate()}
                          </div>
                          <div style={{ textTransform: 'uppercase', fontSize: '0.875rem', fontWeight: 600 }}>
                            {date.toLocaleString('en-US', { month: 'short' })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            <Clock size={12} />
                            {date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            –
                          </div>
                          <div style={{ textTransform: 'uppercase', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            DRAFT
                          </div>
                        </>
                      )}
                    </div>

                    {/* Content Block */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {React.cloneElement(pIcon as React.ReactElement<any>, { color: pColor })}
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {socialAccounts.find(a => String(a.provider_account_id) === String(post.account_id))?.provider_account_name || `${post.platform} Account`}
                          </span>
                          <span style={{ 
                            fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', 
                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '1rem' 
                          }}>
                            {post.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleEditClick(post)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}
                            title="Edit Post"
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}
                            title="Delete Post"
                            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                        {post.content}
                      </p>
                      
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {post.media_urls.map((url, i) => {
                            const secureUrl = url.replace('http://localhost:8000', window.location.origin);
                            const isVideo = secureUrl.toLowerCase().endsWith('.mp4') || secureUrl.toLowerCase().endsWith('.webm') || secureUrl.toLowerCase().endsWith('.mov');
                            return isVideo ? (
                              <video key={i} src={secureUrl} controls preload="metadata" style={{ maxHeight: '250px', borderRadius: '4px', maxWidth: '100%', background: '#000' }} />
                            ) : (
                              <img key={i} src={secureUrl} alt="attached media" style={{ maxHeight: '200px', borderRadius: '4px', maxWidth: '100%' }} />
                            )
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default Posts;
