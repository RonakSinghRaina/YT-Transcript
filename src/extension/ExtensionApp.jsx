import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthModal from '../components/AuthModal';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import { formatTranscriptError, getVideoId } from '../youtube';
import { loadPrefs, prefsToApiPayload } from '../lib/prefs';
import {
  applyFavoriteFlags,
  clearLocalFavoriteIds,
  isDbFavoritesSupported,
  isFavorite,
  loadLocalFavoriteIds,
  probeFavoritesColumn,
  setDbFavoritesSupported,
  setLocalFavorite,
  initLocalFavorites,
} from '../lib/favorites';
import {
  fetchCaptionsFromExtension,
  getActiveYouTubeTabUrl,
  seekYouTubeTab,
} from '../lib/extensionBridge';
import { saveExtensionTranscript } from '../lib/saveExtensionTranscript';
import Dashboard from '../views/Dashboard';
import History from '../views/History';
import Favorites from '../views/Favorites';
import Settings from '../views/Settings';

const NAV = [
  { id: 'dashboard', label: 'Transcript', icon: 'description' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function ExtensionApp() {
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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [tabWarning, setTabWarning] = useState('');
  const inputRef = useRef(null);

  const favoriteHistory = useMemo(
    () => history.filter((item) => isFavorite(item)),
    [history],
  );

  const syncTabUrl = useCallback(async () => {
    const url = await getActiveYouTubeTabUrl();
    if (url) {
      setVideoUrl(url);
      setTabWarning('');
    } else {
      setTabWarning('Open a YouTube watch, Shorts, or embed page, then open TubeScribe again.');
    }
  }, []);

  useEffect(() => {
    syncTabUrl();
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, [syncTabUrl]);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) {
      setHistory([]);
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
    await initLocalFavorites();
    const dbFavorites = await probeFavoritesColumn(supabase, userId);
    setDbFavoritesSupported(dbFavorites);
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
      if (!favoritesRes.error) favoriteRows = favoritesRes.data || [];
    }

    const byId = new Map();
    for (const item of [...favoriteRows, ...(recentRes.data || [])]) {
      byId.set(item.id, item);
    }
    setHistory(
      applyFavoriteFlags(
        [...byId.values()].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      ),
    );
    setHistoryLoading(false);
  }

  async function refreshProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('trial_started_at, display_name')
      .eq('id', session.user.id)
      .maybeSingle();
    const trialStart = data?.trial_started_at ? new Date(data.trial_started_at) : new Date();
    setProfile({
      trialEndsAt: new Date(trialStart.getTime() + 7 * 86400000).toISOString(),
      displayName: data?.display_name || session?.user?.user_metadata?.display_name || null,
    });
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
      if (error) setLocalFavorite(item.id, next);
    } else {
      setLocalFavorite(item.id, next);
    }
    setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, is_favorite: next } : h)));
    if (result?.id === item.id) setResult({ ...result, is_favorite: next });
  }

  async function generateTranscript(event) {
    event?.preventDefault?.();
    setMessage('');
    await syncTabUrl();

    if (!session) {
      setMessage('Please log in to generate transcripts.');
      setAuthMode('signup');
      setAuthOpen(true);
      return;
    }

    const videoId = getVideoId(videoUrl);
    if (!videoId) {
      setMessage(tabWarning || 'Open a YouTube video in this tab first.');
      return;
    }

    const prefs = loadPrefs();
    const apiPrefs = prefsToApiPayload(prefs);
    setLoading(true);

    try {
      const captions = await fetchCaptionsFromExtension(videoId, {
        language: apiPrefs.language ?? null,
        includeTimestamps: apiPrefs.includeTimestamps !== false,
      });

      if (!captions?.transcriptText?.trim()) {
        throw new Error(
          'No captions found. On YouTube, open ⋯ → Show transcript, refresh the page, then try again.',
        );
      }

      const saved = await saveExtensionTranscript({
        supabase,
        session,
        videoUrl: videoUrl.trim(),
        transcriptText: captions.transcriptText,
        title: captions.title,
        prefs,
      });

      setResult(saved);
      await refreshHistory();
      setToastMessage('Transcript saved.');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } catch (error) {
      setMessage(formatTranscriptError(error.message));
    } finally {
      setLoading(false);
    }
  }

  function openHistoryItem(item) {
    setResult(item);
    setVideoUrl(item.video_url || '');
    setPage('dashboard');
    setMessage('');
  }

  async function deleteHistoryItem(id) {
    if (!session || !confirm('Delete this transcript?')) return;
    await supabase.from('transcript_history').delete().eq('id', id).eq('user_id', session.user.id);
    if (result?.id === id) setResult(null);
    await refreshHistory();
  }

  function goHome() {
    setPage('dashboard');
    setResult(null);
    setMessage('');
    syncTabUrl();
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
        <BrandLogo size="sm" onClick={goHome} />
        {session ? (
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-xs font-semibold uppercase text-on-surface-variant hover:text-primary"
          >
            Log out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setAuthOpen(true);
            }}
            className="text-xs font-semibold uppercase text-primary"
          >
            Log in
          </button>
        )}
      </header>

      <nav className="relative z-20 flex shrink-0 gap-1 border-b border-white/5 px-2 py-2">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPage(item.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              page === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-on-surface-variant hover:bg-white/5'
            }`}
          >
            <Icon name={item.icon} className="text-base" fill={page === item.id} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="relative z-10 flex-1 overflow-y-auto p-3">
        {tabWarning && page === 'dashboard' && !result && (
          <p className="mb-3 rounded-2xl border border-outline-variant/40 bg-surface-container-high/50 px-3 py-2 text-xs text-on-surface-variant">
            {tabWarning}
          </p>
        )}

        {page === 'dashboard' && (
          <Dashboard
            variant="extension"
            session={session}
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            result={result}
            loading={loading}
            message={message}
            onGenerate={generateTranscript}
            historySearch=""
            historySearchResults={[]}
            onOpenHistoryResult={openHistoryItem}
            onClearHistorySearch={() => {}}
            onToggleFavorite={toggleFavorite}
            onSummaryLoaded={(summary) => {
              setResult((prev) => (prev ? { ...prev, summary } : prev));
            }}
            onSegmentSeek={seekYouTubeTab}
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
            showMigrationHint={false}
            onOpen={openHistoryItem}
            onDelete={deleteHistoryItem}
            onToggleFavorite={toggleFavorite}
            showHeader={false}
          />
        )}
        {page === 'settings' && (
          <Settings session={session} profile={profile} onProfileUpdate={() => refreshProfile()} />
        )}
      </div>

      <Toast message={toastMessage || 'Done.'} visible={toastVisible} />
      {authOpen && (
        <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
