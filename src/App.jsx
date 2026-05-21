import { useEffect, useRef, useState } from 'react';
import AuthModal from './components/AuthModal';
import SideNav from './components/SideNav';
import Toast from './components/Toast';
import TopBar from './components/TopBar';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  createNotification,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from './lib/notifications';
import { formatTranscriptError, getVideoId } from './youtube';
import Dashboard from './views/Dashboard';
import History from './views/History';
import Settings from './views/Settings';
import Help from './views/Help';

function resolveTranscriptApi() {
  if (import.meta.env.VITE_TRANSCRIPT_API) {
    return import.meta.env.VITE_TRANSCRIPT_API;
  }
  if (import.meta.env.DEV) {
    return '/api/transcript';
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/generate-transcript-v3`;
  }
  return '/api/transcript';
}

const TRANSCRIPT_API = resolveTranscriptApi();

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const inputRef = useRef(null);

  const breadcrumbExtra = result && page === 'dashboard' ? 'Current Transcript' : null;

  function pushNotification(entry) {
    setNotifications((prev) => [entry, ...prev].slice(0, 30));
    return entry;
  }

  function markNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleOpenNotification(item) {
    setPage('dashboard');
    if (item.transcriptId && history.length) {
      const match = history.find((h) => h.id === item.transcriptId);
      if (match) {
        setResult(match);
        setVideoUrl(match.video_url || '');
      }
    }
    if (item.type === 'error') setMessage(item.message);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) {
      setHistory([]);
      return;
    }
    refreshHistory();
    refreshProfile();
  }, [session?.user?.id]);

  async function refreshHistory() {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('transcript_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(48);
    setHistory(data || []);
    setHistoryLoading(false);
  }

  async function refreshProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('trial_started_at, display_name')
      .eq('id', session.user.id)
      .maybeSingle();
    const trialStart = data?.trial_started_at ? new Date(data.trial_started_at) : new Date();
    const metaName = session?.user?.user_metadata?.display_name;
    setProfile({
      trialEndsAt: new Date(trialStart.getTime() + 7 * 86400000).toISOString(),
      displayName: data?.display_name || metaName || null,
    });
  }

  function goHome() {
    setPage('dashboard');
    setMessage('');
  }

  function handleProfileUpdate(updates) {
    setProfile((prev) => ({ ...prev, ...updates }));
  }

  function openAuth(mode = 'signup') {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function handleNewTranscript() {
    setPage('dashboard');
    setResult(null);
    setVideoUrl('');
    setMessage('');
    setTranscriptSearch('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function generateTranscript(event) {
    event?.preventDefault?.();
    setMessage('');

    if (!session) {
      openAuth('signup');
      return;
    }

    const videoId = getVideoId(videoUrl);
    if (!videoId) {
      setMessage('Paste a valid YouTube link, Shorts link, share link, embed link, or 11-character video ID.');
      return;
    }

    setLoading(true);
    pushNotification(
      createNotification({
        type: 'info',
        title: 'Transcription started',
        message: 'We are extracting captions for your video. This can take a minute.',
      }),
    );

    try {
      const response = await fetch(TRANSCRIPT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ videoUrl: videoUrl.trim() }),
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Server error (${response.status}). Restart npm run dev and try again.`);
      }
      if (!response.ok) {
        throw new Error(formatTranscriptError(payload.error || payload.message));
      }
      if (!payload?.transcript) {
        throw new Error('No transcript was returned from the server.');
      }
      setResult({ ...payload.transcript, summary: payload.summary });
      setProfile({ trialEndsAt: payload.trialEndsAt });
      setPage('dashboard');
      await refreshHistory();

      const title = payload.transcript?.title || 'Your video';
      pushNotification(
        createNotification({
          type: 'success',
          title: 'Transcript ready',
          message: `"${title}" is saved and ready to read.`,
          transcriptId: payload.transcript?.id,
        }),
      );

      const permission = await requestBrowserNotificationPermission();
      if (permission === 'granted') {
        showBrowserNotification('TubeScribe — Transcript ready', title);
      }

      setToastMessage('Transcript generated and saved.');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    } catch (error) {
      const errMsg = formatTranscriptError(error.message);
      setMessage(errMsg);
      pushNotification(
        createNotification({
          type: 'error',
          title: 'Transcription failed',
          message: errMsg,
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase?.auth.signOut();
    setResult(null);
    setPage('dashboard');
  }

  async function deleteHistoryItem(id) {
    if (!session || !confirm('Delete this transcript?')) return;
    await supabase.from('transcript_history').delete().eq('id', id);
    if (result?.id === id) setResult(null);
    await refreshHistory();
  }

  function openHistoryItem(item) {
    setResult(item);
    setVideoUrl(item.video_url || '');
    setPage('dashboard');
    setMessage('');
  }

  function handleNavigate(nextPage) {
    if (nextPage === 'login') {
      openAuth('login');
      return;
    }
    setPage(nextPage);
    setMessage('');
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <div className="noise-overlay" aria-hidden />
      <div className="ambient-glow ambient-glow-purple h-[600px] w-[600px] -left-[100px] -top-[100px]" aria-hidden />
      <div className="ambient-glow ambient-glow-blue h-[800px] w-[800px] -right-[200px] top-[20%]" aria-hidden />
      <div className="ambient-glow ambient-glow-purple h-[500px] w-[500px] -bottom-[200px] left-[20%]" aria-hidden />

      <SideNav
        page={page}
        onNavigate={handleNavigate}
        onGoHome={goHome}
        onNewTranscript={handleNewTranscript}
        onLogout={logout}
        onLogin={() => openAuth('login')}
        session={session}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar
          page={page}
          session={session}
          profile={profile}
          searchQuery={transcriptSearch}
          onSearchChange={setTranscriptSearch}
          onOpenAuth={() => openAuth('login')}
          onGoHome={goHome}
          breadcrumbExtra={breadcrumbExtra}
          notifications={notifications}
          onMarkNotificationsRead={markNotificationsRead}
          onOpenNotification={handleOpenNotification}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
          {page === 'dashboard' && (
            <Dashboard
              session={session}
              videoUrl={videoUrl}
              setVideoUrl={setVideoUrl}
              result={result}
              loading={loading}
              message={message}
              onGenerate={generateTranscript}
              transcriptSearch={transcriptSearch}
              inputRef={inputRef}
            />
          )}
          {page === 'history' && (
            <History
              history={history}
              loading={historyLoading}
              onOpen={openHistoryItem}
              onDelete={deleteHistoryItem}
            />
          )}
          {page === 'settings' && (
            <Settings
              session={session}
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
          {page === 'help' && (
            <Help onGoHome={goHome} onNewTranscript={handleNewTranscript} />
          )}
        </div>
      </main>

      <Toast message={toastMessage || 'Transcript segment selected.'} visible={toastVisible} />
      {authOpen && (
        <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
