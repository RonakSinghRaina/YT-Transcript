import { useEffect, useMemo, useRef, useState } from 'react';
import AuthModal from './components/AuthModal';
import SideNav from './components/SideNav';
import Toast from './components/Toast';
import TopBar from './components/TopBar';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  createNotification,
  notifyTranscriptComplete,
  requestBrowserNotificationPermission,
} from './lib/notifications';
import { formatTranscriptError, getVideoId } from './youtube';
import { loadPrefs, prefsToApiPayload } from './lib/prefs';
import { applyTranscriptionPrefs } from './lib/processTranscript';
import {
  isFavorite,
  loadLocalFavoriteIds,
  clearLocalFavoriteIds,
  applyFavoriteFlags,
  probeFavoritesColumn,
  setDbFavoritesSupported,
  isDbFavoritesSupported,
  setLocalFavorite,
} from './lib/favorites';
import { resolveTranscriptApi, PRODUCTION_API_SETUP_HINT } from './lib/apiConfig';
import { searchHistoryItems } from './lib/searchHistory';
import Dashboard from './views/Dashboard';
import History from './views/History';
import Favorites from './views/Favorites';
import Settings from './views/Settings';
import Help from './views/Help';

const TRANSCRIPT_API = resolveTranscriptApi();

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('Account');
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
  const [historySearch, setHistorySearch] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [favoritesSetupHint, setFavoritesSetupHint] = useState('');
  const inputRef = useRef(null);

  const breadcrumbExtra = result && page === 'dashboard' ? 'Current Transcript' : null;

  const historySearchResults = useMemo(
    () => searchHistoryItems(history, historySearch),
    [history, historySearch],
  );

  const favoriteHistory = useMemo(
    () => history.filter((item) => isFavorite(item)),
    [history],
  );

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
        openHistoryItem(match);
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
      setFavoritesSetupHint('');
      setDbFavoritesSupported(null);
      return;
    }
    refreshHistory();
    refreshProfile();
  }, [session?.user?.id]);

  async function syncLocalFavoritesToDatabase(userId) {
    if (!isDbFavoritesSupported()) return;
    const local = loadLocalFavoriteIds();
    if (!local.size) return;

    await Promise.all(
      [...local].map((id) =>
        supabase
          .from('transcript_history')
          .update({ is_favorite: true })
          .eq('id', id)
          .eq('user_id', userId),
      ),
    );
    clearLocalFavoriteIds();
  }

  async function refreshHistory() {
    if (!session?.user?.id) return;
    setHistoryLoading(true);
    const userId = session.user.id;

    const dbFavorites = await probeFavoritesColumn(supabase, userId);
    setDbFavoritesSupported(dbFavorites);
    setFavoritesSetupHint(
      dbFavorites
        ? ''
        : 'Favorites are saved on this device until you add the is_favorite column in Supabase (see Help).',
    );

    await syncLocalFavoritesToDatabase(userId);

    const recentRes = await supabase
      .from('transcript_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    let favoriteRows = [];
    if (dbFavorites) {
      const favoritesRes = await supabase
        .from('transcript_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (!favoritesRes.error) {
        favoriteRows = favoritesRes.data || [];
      }
    }

    const byId = new Map();
    for (const item of [...favoriteRows, ...(recentRes.data || [])]) {
      byId.set(item.id, item);
    }
    const merged = applyFavoriteFlags(
      [...byId.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    );

    setHistory(merged);
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

  /** Landing page: paste URL screen (clears open transcript). */
  function goHome() {
    setPage('dashboard');
    setResult(null);
    setVideoUrl('');
    setMessage('');
    setHistorySearch('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function openSettings(tab = 'Account') {
    setSettingsTab(tab);
    setPage('settings');
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
    setHistorySearch('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function toggleFavorite(item) {
    if (!item?.id || !session?.user?.id) return;
    const next = !isFavorite(item);

    if (isDbFavoritesSupported()) {
      const { error } = await supabase
        .from('transcript_history')
        .update({ is_favorite: next })
        .eq('id', item.id)
        .eq('user_id', session.user.id);

      if (error) {
        setLocalFavorite(item.id, next);
      }
    } else {
      setLocalFavorite(item.id, next);
    }

    setHistory((prev) =>
      prev.map((h) => (h.id === item.id ? { ...h, is_favorite: next } : h)),
    );
    if (result?.id === item.id) {
      setResult({ ...result, is_favorite: next });
    }
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

    const prefs = loadPrefs();
    const apiPrefs = prefsToApiPayload(prefs);

    if (prefs.notifyOnComplete && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        await requestBrowserNotificationPermission();
      }
    }

    if (!TRANSCRIPT_API) {
      setMessage(PRODUCTION_API_SETUP_HINT);
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
        body: JSON.stringify({
          videoUrl: videoUrl.trim(),
          ...apiPrefs,
        }),
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        if (response.status === 405) {
          throw new Error('PRODUCTION_API_NOT_CONFIGURED');
        }
        throw new Error(`Server error (${response.status}). Restart npm run dev and try again.`);
      }
      if (!response.ok) {
        throw new Error(formatTranscriptError(payload.error || payload.message));
      }
      if (!payload?.transcript) {
        throw new Error('No transcript was returned from the server.');
      }

      const processedTranscript = applyTranscriptionPrefs(
        payload.transcript.transcript,
        prefs,
      );
      const saved = {
        ...payload.transcript,
        transcript: processedTranscript,
        summary: prefs.autoSummary ? payload.summary : null,
      };

      setResult(saved);
      setProfile({ trialEndsAt: payload.trialEndsAt });
      setPage('dashboard');
      setHistorySearch('');
      await refreshHistory();

      const title = saved.title || 'Your video';
      pushNotification(
        createNotification({
          type: 'success',
          title: 'Transcript ready',
          message: `"${title}" is saved and ready to read.`,
          transcriptId: saved.id,
        }),
      );

      if (prefs.notifyOnComplete) {
        notifyTranscriptComplete(title);
      }

      setToastMessage('Transcript generated and saved.');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    } catch (error) {
      let errMsg = formatTranscriptError(error.message);
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        errMsg =
          'Could not reach the transcript server. If using the desktop app: close it, run npm run electron:dev again, and ensure Vercel is redeployed with the latest code. Also check APIFY_TOKEN on Vercel.';
      }
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
    await supabase.from('transcript_history').delete().eq('id', id).eq('user_id', session.user.id);
    if (result?.id === id) setResult(null);
    await refreshHistory();
  }

  function openHistoryItem(item) {
    setResult(item);
    setVideoUrl(item.video_url || '');
    setPage('dashboard');
    setMessage('');
    setHistorySearch('');
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
      <div className="ambient-glow ambient-glow-purple h-[500px] w-[500px] -left-[120px] -top-[80px]" aria-hidden />
      <div className="ambient-glow ambient-glow-deep h-[420px] w-[420px] -right-[140px] top-[25%]" aria-hidden />

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
          searchQuery={historySearch}
          onSearchChange={setHistorySearch}
          onOpenAuth={() => openAuth('login')}
          onGoHome={goHome}
          onOpenSettings={() => openSettings('Account')}
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
              historySearch={historySearch}
              historySearchResults={historySearchResults}
              onOpenHistoryResult={openHistoryItem}
              onClearHistorySearch={() => setHistorySearch('')}
              onToggleFavorite={toggleFavorite}
              onSummaryLoaded={(summary) => {
                setResult((prev) => (prev ? { ...prev, summary } : prev));
              }}
              inputRef={inputRef}
            />
          )}
          {page === 'history' && (
            <History
              history={history}
              loading={historyLoading}
              onOpen={openHistoryItem}
              onDelete={deleteHistoryItem}
              onToggleFavorite={toggleFavorite}
            />
          )}
          {page === 'favorites' && (
            <Favorites
              history={favoriteHistory}
              loading={historyLoading}
              setupHint={favoritesSetupHint}
              onOpen={openHistoryItem}
              onDelete={deleteHistoryItem}
              onToggleFavorite={toggleFavorite}
              showHeader={false}
            />
          )}
          {page === 'settings' && (
            <Settings
              session={session}
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
              initialTab={settingsTab}
            />
          )}
          {page === 'help' && (
            <Help onGoHome={goHome} onNewTranscript={handleNewTranscript} />
          )}
        </div>
      </main>

      <Toast message={toastMessage || 'Done.'} visible={toastVisible} />
      {authOpen && (
        <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
