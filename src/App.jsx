import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import Calendar from './Calendar';
import Timeline from './Timeline';
import Search from './Search';
import { jsPDF } from 'jspdf';
import './App.css';
import Themes from './Themes';
import { auth, signInWithGoogle, logout } from './firebase/auth'; // Firebase Auth restored
import { onAuthStateChanged } from 'firebase/auth';
import { getEntry, saveEntry } from './firebase/db'; // Firebase DB restored
import { syncEntryToFirebase } from './firebase/sync'; // Sync helper (Hybrid)

const MOODS = [
  { val: 'mood-1', icon: '😶' },
  { val: 'mood-2', icon: '🙂' },
  { val: 'mood-3', icon: '😔' },
  { val: 'mood-4', icon: '😲' },
  { val: 'mood-5', icon: '😌' }
];

const WRITING_PROMPTS = [
  "How was your day? Write about your experiences..."
];

// Memoized views for performance
const MemoizedCalendar = memo(Calendar);
const MemoizedTimeline = memo(Timeline);
const MemoizedSearch = memo(Search);

// Theme Definitions
const THEMES = [
  { id: 'default', name: 'Classic Wooden', url: '/bg_final.png' },
  { id: 'dark-wood', name: 'Dark Wood', url: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?q=80&w=2574&auto=format&fit=crop' },
  { id: 'misty-forest', name: 'Misty Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2500&auto=format&fit=crop' },
  { id: 'cosmic-night', name: 'Cosmic Night', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2500&auto=format&fit=crop' },
  { id: 'cozy-library', name: 'Cozy Library', url: 'https://images.unsplash.com/photo-1507842217153-e3c035efca1c?q=80&w=2500&auto=format&fit=crop' },
  { id: 'sunset-dream', name: 'Sunset Dream', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2500&auto=format&fit=crop' }
];

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('editor');

  // Data State
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]);
  const [audioNotes, setAudioNotes] = useState([]);
  const [mood, setMood] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Auth & Loading State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [initialData, setInitialData] = useState(null); // To track changes

  // UI State
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Book Interface State
  const [isOpen, setIsOpen] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [prevDateData, setPrevDateData] = useState(null);

  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptsDismissed, setPromptsDismissed] = useState(() => {
    return localStorage.getItem('relive_prompts_dismissed') === 'true';
  });

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const blobMapRef = useRef({}); // New: Store actual Blobs for reliability

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  // Derived Date Key: YYYY-MM-DD
  const dateKey = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Theme State
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('relive_theme') || 'default';
  });

  // Apply Theme to Body (or wrapper)
  useEffect(() => {
    const theme = THEMES.find(t => t.id === currentTheme) || THEMES[0];
    localStorage.setItem('relive_theme', currentTheme);
    document.body.style.backgroundImage = `
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 10%, rgba(0, 0, 0, 0.6) 90%),
      url("${theme.url}")
    `;
  }, [currentTheme]);

  // Auth Listener (Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Previous Day Logic (For Left Page Context)
  useEffect(() => {
    if (!user) return; // Wait for auth

    const fetchPrev = async () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;

      try {
        const data = await getEntry(key);
        if (data) {
          setPrevDateData({ text: data.text || '', dateObj: d });
        } else {
          setPrevDateData(null);
        }
      } catch (e) {
        console.error("Error fetching prev date:", e);
        setPrevDateData(null);
      }
    };
    fetchPrev();
  }, [dateKey, user]);

  // Load Current Entry from Firebase
  useEffect(() => {
    if (!user) {
      // Clear state if not logged in
      setText(''); setTags([]); setIsFavorite(false); setImages([]); setAudioNotes([]); setMood(null);
      return;
    }

    const loadData = async () => {
      setDataLoading(true);
      setSummary(null);
      try {
        const data = await getEntry(dateKey); // Firebase DB
        if (data) {
          setInitialData(data); // Save for dirty checking
          setText(data.text || '');
          setTags(data.tags || []);
          setIsFavorite(!!data.isFavorite);
          // Ensure arrays
          setImages(data.images || []);
          setAudioNotes(data.audioNotes || []);
          setMood(data.mood || null);
        } else {
          setInitialData({});
          setText('');
          setTags([]);
          setIsFavorite(false);
          setImages([]);
          setAudioNotes([]);
          setMood(null);
          setCurrentPrompt(WRITING_PROMPTS[0]);
        }
      } catch (error) {
        console.error("Failed to load entry:", error);
        alert("Error loading data. Check console.");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [dateKey, user]);

  const [lastSaveTime, setLastSaveTime] = useState(0);

  // Save Logic
  // Save Logic (Hybrid: Media -> Supabase, Metadata -> Firebase)
  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      setLastSaveTime(Date.now());
      // Prepare data (convert audio URLs back to Blobs where possible for reliability)
      const audioWithBlobs = audioNotes.map(url => blobMapRef.current[url] || url);
      const currentData = { text, tags, isFavorite, images, audioNotes: audioWithBlobs, mood };

      // Upload & Sync
      const { images: newImages, audioNotes: newAudio } = await syncEntryToFirebase(dateKey, currentData);

      // Update UI with valid Signed URLs
      setImages(newImages);
      setAudioNotes(newAudio);

      // Update Reference State
      setInitialData({ ...currentData, images: newImages, audioNotes: newAudio });

      // Feedback
      alert("Journal entry saved successfully!");

    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save changes: " + e.message);
    } finally {
      setIsSaving(false);
    }
  }, [dateKey, text, tags, isFavorite, images, audioNotes, mood, user]);

  const hasUnsavedChanges = useCallback(() => {
    // If we haven't loaded data yet, we can't have "unsaved changes" relative to DB
    if (!initialData) return false;

    // Helper to normalize strings (treat null, undefined, "" as same)
    const norm = (str) => str || '';

    // 1. Text Check
    if (norm(text) !== norm(initialData.text)) return true;

    // 2. Mood Check
    if ((mood || null) !== (initialData.mood || null)) return true;

    // 3. Favorite Check
    if (!!isFavorite !== !!initialData.isFavorite) return true;

    // 4. Tags Check (Length first, then content)
    const currentTags = tags || [];
    const savedTags = initialData.tags || [];
    if (currentTags.length !== savedTags.length) return true;
    if (JSON.stringify(currentTags) !== JSON.stringify(savedTags)) return true;

    // 5. Media Check (Relaxed: Only check count)
    const currentImages = images || [];
    const savedImages = initialData.images || [];
    if (currentImages.length !== savedImages.length) return true;

    const currentAudio = audioNotes || [];
    const savedAudio = initialData.audioNotes || [];
    if (currentAudio.length !== savedAudio.length) return true;

    return false;
  }, [text, tags, isFavorite, images.length, audioNotes.length, mood, initialData]);

  // Navigation Wrappers
  const confirmNav = () => {
    // If no changes, allow navigation immediately
    if (!hasUnsavedChanges()) return true;

    // If changes, prompt user
    return window.confirm("You have unsaved changes. Discard them?");
  };


  const toView = (v) => {
    if (v === view || !confirmNav()) return;
    setFlipping(true);
    setTimeout(() => { setView(v); setFlipping(false); }, 600); // Wait for page half-flip
  };

  const toDate = (d) => {
    if (!confirmNav()) return;
    setFlipping(true);
    setTimeout(() => { setCurrentDate(d); setView('editor'); setFlipping(false); }, 600);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); toView('search'); }
      // ESC always closes Book unless already closed
      if (e.key === 'Escape') {
        if (view !== 'editor') toView('editor');
        else if (isOpen) setIsOpen(false);
      }
      // Date Nav
      if ((e.ctrlKey || e.metaKey) && !isInput) {
        const d = new Date(currentDate);
        if (e.key === 'ArrowLeft') { d.setDate(d.getDate() - 1); toDate(d); }
        if (e.key === 'ArrowRight') { d.setDate(d.getDate() + 1); toDate(d); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentDate, isOpen, view, hasUnsavedChanges]);

  // AI Logic
  const handleSummarize = async () => {
    if (!text.trim()) return;
    setIsSummarizing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSummary("A quiet reflection on the day's events.");
    setIsSummarizing(false);
  };

  const handleDismissPrompts = () => {
    setPromptsDismissed(true);
    localStorage.setItem('relive_prompts_dismissed', 'true');
  };

  // Tag Helpers
  const addTag = () => { const t = tagInput.trim(); if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); } };
  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Store the actual blob for the save process
        blobMapRef.current[audioUrl] = audioBlob;

        setAudioNotes(prev => [...prev, audioUrl]);

        // Stop all tracks to clean up hardware access
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Audio recording failed", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (authLoading) return <div className="loading-screen">Loading ReLive...</div>;

  if (!user) {
    return (
      <div className="scene">
        <div className="book closed" style={{ cursor: 'default' }}>
          <div className="layer cover">
            <div className="cover-title">ReLive</div>
            <div className="cover-subtitle">JOURNAL</div>

            <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <button
                onClick={signInWithGoogle}
                style={{
                  padding: '14px 35px',
                  fontSize: '1.1rem',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(197, 160, 101, 0.5)',
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
                  color: '#e0c080',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(2px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(197, 160, 101, 0.15)';
                  e.target.style.borderColor = '#c5a065';
                  e.target.style.color = '#fff';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))';
                  e.target.style.borderColor = 'rgba(197, 160, 101, 0.5)';
                  e.target.style.color = '#e0c080';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
                }}
              >
                Unlock Journal
              </button>

              <span style={{
                fontSize: '0.85rem',
                color: 'rgba(197, 160, 101, 0.4)',
                fontFamily: 'var(--font-primary)',
                fontStyle: 'italic',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}>
                Sign in securely with Google
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scene">
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
        {/* User Profile / Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.8)', padding: '5px 10px', borderRadius: 20 }}>
          {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: 24, height: 24, borderRadius: '50%' }} />}
          <span style={{ fontSize: '0.8rem' }}>{user.displayName}</span>
          <button onClick={logout} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Logout</button>
        </div>


      </div>

      <div className={`book ${isOpen ? 'open' : 'closed'}`} onClick={() => !isOpen && setIsOpen(true)}>

        {/* Cover - Always Visible */}
        <div className="layer cover">
          <div className="cover-title">ReLive</div>
          <div className="cover-subtitle">JOURNAL</div>
        </div>

        {/* Inner Pages - Render ONLY when open */}
        {isOpen && (
          <>
            {/* Left Page: Previous Context */}
            <div className="layer page left">
              <div className="nav-arrow left" onClick={(e) => {
                e.stopPropagation();
                const d = new Date(currentDate);
                d.setDate(d.getDate() - 1);
                toDate(d);
              }} title="Previous Day">
                &#10094;
              </div>
              {prevDateData ? (
                <div className="prev-entry-content">
                  <div className="prev-date">{prevDateData.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  <div className="prev-text">{prevDateData.text.substring(0, 300)}...</div>
                </div>
              ) : (
                <div className="prev-entry-content" style={{ opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  (No previous entry)
                </div>
              )}
            </div>

            {/* Right Page: Active Editor & Views */}
            <div className={`layer page right ${flipping ? 'flipping' : ''}`}>
              <div className="nav-arrow right" onClick={(e) => {
                e.stopPropagation();
                const d = new Date(currentDate);
                d.setDate(d.getDate() + 1);
                toDate(d);
              }} title="Next Day">
                &#10095;
              </div>

              {/* Divider Tabs */}
              <div className="book-tabs">
                <div className={`book-tab ${view === 'calendar' ? 'active' : ''}`} onClick={() => toView('calendar')} title="Calendar">C</div>
                <div className={`book-tab ${view === 'timeline' ? 'active' : ''}`} onClick={() => toView('timeline')} title="History">H</div>
                <div className={`book-tab ${view === 'search' ? 'active' : ''}`} onClick={() => toView('search')} title="Search">Q</div>
                <div className={`book-tab ${view === 'favorites' ? 'active' : ''}`} onClick={() => toView('favorites')} title="Favorites">★</div>
                <div className={`book-tab ${view === 'themes' ? 'active' : ''}`} onClick={() => toView('themes')} title="Ambiance">🎨</div>
                {view !== 'editor' && <div className="book-tab" onClick={() => toView('editor')} title="Write">✎</div>}

                {/* Theme Selectors Removed */}
              </div>

              {/* Bookmark (Save) */}
              {view === 'editor' && (
                <div className={`ribbon-bookmark ${!hasUnsavedChanges() ? 'saved' : ''}`} onClick={handleSave} title={hasUnsavedChanges() ? "Save Changes" : "Saved"}>
                  <span className="ribbon-label">{isSaving ? 'SAVING...' : (hasUnsavedChanges() ? 'SAVE' : 'SAVED')}</span>
                </div>
              )}

              {/* Dynamic Content */}
              {view !== 'editor' ? (
                <div className="page-view-overlay">
                  {view === 'calendar' && <MemoizedCalendar selectedDate={currentDate} onDateSelect={toDate} />}
                  {view === 'timeline' && <MemoizedTimeline onEntrySelect={(d) => {
                    const [y, m, day] = d.split('-').map(Number); toDate(new Date(y, m - 1, day));
                  }} />}
                  {view === 'search' && <MemoizedSearch onSelect={(d) => {
                    const [y, m, day] = d.split('-').map(Number); toDate(new Date(y, m - 1, day));
                  }} onClose={() => toView('editor')} />}
                  {view === 'favorites' && <MemoizedTimeline onEntrySelect={(d) => {
                    const [y, m, day] = d.split('-').map(Number); toDate(new Date(y, m - 1, day));
                  }} onlyFavorites={true} />}
                  {view === 'themes' && <Themes themes={THEMES} currentTheme={currentTheme} onSelect={setCurrentTheme} onClose={() => toView('editor')} />}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Header */}
                  <div className="page-header">
                    <div className="mood-selector-ink">
                      {MOODS.map(m => (
                        <span key={m.val} className={`mood-ink ${mood === m.val ? 'active' : ''}`} onClick={() => setMood(m.val === mood ? null : m.val)}>
                          {m.icon}
                        </span>
                      ))}
                    </div>
                    <div className="date-display-main">
                      <span className="dd-day">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                      <span className="dd-date">{currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="editor-container">
                    {dataLoading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 }}>Loading...</div>}
                    {!dataLoading && !text && !promptsDismissed && currentPrompt && (
                      <div className="ink-prompt">{currentPrompt}
                        <span onClick={handleDismissPrompts} style={{ cursor: 'pointer', marginLeft: 10, fontStyle: 'normal' }}>x</span>
                      </div>
                    )}

                    <textarea
                      ref={editorRef}
                      className="editor-textarea"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder=""
                      spellCheck={false}
                    />

                    {/* Sticky Note AI */}
                    {summary && (
                      <div className="sticky-note">
                        {summary}
                        <div onClick={() => setSummary(null)} style={{ textAlign: 'right', cursor: 'pointer', fontSize: '0.8rem' }}>x</div>
                      </div>
                    )}

                    {/* Photo Button */}
                    <input type="file" ref={fileInputRef} hidden onChange={(e) => Array.from(e.target.files).forEach(f => {
                      if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = x => setImages(p => [...p, x.target.result]); r.readAsDataURL(f); }
                    })} />
                    <div style={{ position: 'absolute', bottom: 40, right: 10, opacity: 0.6, cursor: 'pointer', fontSize: '1.5rem', zIndex: 50 }} onClick={() => fileInputRef.current?.click()} title="Add Photo">📷</div>

                    {/* Polaroids */}
                    {images.map((src, i) => (
                      <img key={i} src={src} className="polaroid" onClick={() => setImages(p => p.filter((_, idx) => idx !== i))} />
                    ))}

                    {/* Tags */}
                    <div className="tags-row">
                      {tags.map(t => <span key={t} className="tag-item" onClick={() => removeTag(t)}>#{t}</span>)}
                      {showTagInput ? (
                        <input
                          autoFocus
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTag()}
                          onBlur={() => setShowTagInput(false)}
                          style={{ border: 'none', borderBottom: '1px solid #999', background: 'transparent', width: 60, fontStyle: 'italic' }}
                        />
                      ) : (
                        <span style={{ opacity: 0.5, cursor: 'pointer' }} onClick={() => setShowTagInput(true)}>+ tag</span>
                      )}

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* Audio Button */}
                        <div
                          className={`record-btn-ink ${isRecording ? 'recording' : ''}`}
                          onClick={isRecording ? stopRecording : startRecording}
                          title={isRecording ? "Stop Recording" : "Record Audio Note"}
                        >
                          {isRecording ? '● Rec...' : '🎙 Audio Note'}
                        </div>
                        {/* AI Button */}
                        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={handleSummarize} title="AI Reflection">✧ Reflection</span>
                      </div>
                    </div>

                    {/* Audio Player List */}
                    {audioNotes.length > 0 && (
                      <div style={{ marginTop: 15, padding: 10, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        {audioNotes.map((url, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <audio controls src={url} style={{ height: 30, opacity: 0.8 }} />
                            <span onClick={() => setAudioNotes(p => p.filter((_, x) => x !== i))} style={{ cursor: 'pointer', color: '#999' }}>x</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default App;
