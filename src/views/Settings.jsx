import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { getDisplayName, getInitials } from '../lib/profile';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../lib/prefs';
import {
  requestBrowserNotificationPermission,
} from '../lib/notifications';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

const TABS = ['Account', 'Transcription', 'Integrations', 'Notifications'];

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <h4 className="font-semibold text-on-surface">{label}</h4>
        {hint && <p className="mt-1 text-sm text-primary">{hint}</p>}
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="peer h-6 w-11 rounded-full bg-surface-variant after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all peer-checked:bg-primary-container peer-checked:after:translate-x-full" />
      </label>
    </div>
  );
}

export default function Settings({ session, profile, onProfileUpdate, initialTab = 'Account' }) {
  const [tab, setTab] = useState(initialTab);
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [displayName, setDisplayName] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState('');

  const email = session?.user?.email || 'Not signed in';
  const initials = getInitials(displayName, email);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setDisplayName(getDisplayName(session, profile));
  }, [session?.user?.id, profile?.displayName, session?.user?.user_metadata?.display_name]);

  useEffect(() => {
    savePrefs(prefs);
    setPrefsSaved(true);
    const t = setTimeout(() => setPrefsSaved(false), 2000);
    return () => clearTimeout(t);
  }, [prefs]);

  async function saveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setAccountStatus('Display name cannot be empty.');
      return;
    }
    if (!session || !isSupabaseConfigured) {
      setAccountStatus('Sign in to save your display name.');
      return;
    }

    setSavingName(true);
    setAccountStatus('');

    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    });

    if (authError) {
      setSavingName(false);
      setAccountStatus(authError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, email: session.user.email, display_name: trimmed }, { onConflict: 'id' });

    setSavingName(false);

    if (profileError) {
      setAccountStatus(profileError.message);
      return;
    }

    onProfileUpdate?.({ displayName: trimmed });
    setAccountStatus('Display name saved.');
    setTimeout(() => setAccountStatus(''), 3000);
  }

  async function enableBrowserNotifications() {
    const permission = await requestBrowserNotificationPermission();
    if (permission === 'granted') {
      setNotifyStatus('Browser notifications enabled.');
      setPrefs({ ...prefs, notifyOnComplete: true });
    } else if (permission === 'denied') {
      setNotifyStatus('Notifications blocked. Allow them in your browser site settings.');
    } else {
      setNotifyStatus('Notifications not supported in this browser.');
    }
  }

  return (
    <div className="mx-auto max-w-[var(--spacing-container-max)]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface md:text-3xl">Settings</h2>
        <p className="mt-2 text-primary">Manage your account preferences and integration details.</p>
        {prefsSaved && (
          <p className="mt-2 text-sm font-semibold text-primary">Preferences saved.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav className="flex gap-2 overflow-x-auto pb-4 lg:flex-col lg:overflow-visible lg:pb-0">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                  tab === name
                    ? 'bg-surface-container-highest font-bold text-on-surface'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'
                }`}
              >
                {name}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-8 lg:col-span-9">
          {tab === 'Account' && (
            <section className="glass-panel rounded-xl p-6">
              <h3 className="mb-6 border-b border-white/10 pb-2 text-xl font-semibold">Account Details</h3>
              <div className="mb-8 flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-gradient-accent-soft text-2xl font-bold text-primary">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{displayName || 'Your name'}</p>
                  <p className="text-sm text-primary">{email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={48}
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Email</label>
                  <input type="email" readOnly value={email} className="glass-input w-full rounded-lg px-3 py-2 text-sm text-on-surface-variant" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={saveDisplayName} disabled={savingName || !session} className="rounded-lg bg-gradient-accent px-4 py-2 text-sm font-medium text-on-primary-container disabled:opacity-50">
                  {savingName ? 'Saving…' : 'Save display name'}
                </button>
                {accountStatus && (
                  <span className={`text-sm ${accountStatus.includes('saved') ? 'text-primary font-semibold' : 'text-error'}`}>
                    {accountStatus}
                  </span>
                )}
              </div>
              <div className="mt-8 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <div>
                  <h4 className="font-bold text-on-surface">Free forever plan</h4>
                  <p className="text-sm text-primary">
                    Unlimited transcripts. No daily credits, no trial expiry.
                  </p>
                </div>
              </div>
            </section>
          )}

          {tab === 'Transcription' && (
            <section className="glass-panel space-y-8 rounded-xl p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-on-surface">Transcription Settings</h3>
                  <p className="mt-1 text-sm text-primary">Controls how transcripts are generated and displayed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs({ ...DEFAULT_PREFS })}
                  className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  Reset to defaults
                </button>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-on-surface-variant">Core settings</h4>
                <p className="mb-3 text-xs text-primary">
                  If you see &quot;no captions&quot;, set OPENAI_API_KEY in server .env for Whisper fallback, or change the language below.
                </p>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Transcript language</label>
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                  className="glass-input mb-4 w-full rounded-lg px-3 py-2 text-sm md:w-1/2"
                >
                  <option value="auto">Auto detect</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                </select>

                <label className="mb-2 block text-xs font-medium text-on-surface-variant">Timestamp format</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    ['none', 'None'],
                    ['paragraph', 'Every paragraph'],
                    ['sentence', 'Every sentence'],
                    ['custom', 'Custom interval'],
                  ].map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name="ts"
                        checked={prefs.timestampFormat === value}
                        onChange={() => setPrefs({ ...prefs, timestampFormat: value })}
                        className="text-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {prefs.timestampFormat === 'custom' && (
                  <div className="mt-3">
                    <label className="text-xs text-on-surface-variant">Interval (seconds)</label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={prefs.timestampInterval}
                      onChange={(e) => setPrefs({ ...prefs, timestampInterval: Number(e.target.value) })}
                      className="glass-input mt-1 w-32 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <Toggle
                  label="Speaker detection"
                  checked={prefs.speakerDetection}
                  onChange={(v) => setPrefs({ ...prefs, speakerDetection: v })}
                  hint="Label segments as alternating speakers (chat-style)."
                />
                <Toggle
                  label="Auto punctuation"
                  checked={prefs.autoPunctuation}
                  onChange={(v) => setPrefs({ ...prefs, autoPunctuation: v })}
                  hint="Add commas and full stops automatically."
                />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-on-surface-variant">AI cleanup</h4>
                <Toggle label='Remove filler words ("uh", "um")' checked={prefs.removeFillers} onChange={(v) => setPrefs({ ...prefs, removeFillers: v })} />
                <Toggle label="Fix grammar" checked={prefs.fixGrammar} onChange={(v) => setPrefs({ ...prefs, fixGrammar: v })} hint="Best-effort cleanup when OpenAI is configured server-side." />
                <Toggle label="Improve readability" checked={prefs.improveReadability} onChange={(v) => setPrefs({ ...prefs, improveReadability: v })} />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-on-surface-variant">Transcript format</h4>
                <div className="flex flex-wrap gap-3">
                  {[
                    ['paragraph', 'Paragraph mode'],
                    ['subtitle', 'Subtitle mode'],
                    ['chat', 'Chat-style mode'],
                  ].map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name="format"
                        checked={prefs.transcriptFormat === value}
                        onChange={() => setPrefs({ ...prefs, transcriptFormat: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-on-surface-variant">Export format (default)</h4>
                <select
                  value={prefs.exportFormat}
                  onChange={(e) => setPrefs({ ...prefs, exportFormat: e.target.value })}
                  className="glass-input w-full rounded-lg px-3 py-2 text-sm md:w-1/2"
                >
                  <option value="txt">TXT</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX (via PDF print)</option>
                  <option value="srt">SRT</option>
                </select>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-on-surface-variant">AI summary</h4>
                <p className="mb-3 text-xs text-primary">
                  For accurate summaries, set OPENAI_API_KEY or GEMINI_API_KEY in your server .env (Vercel/local dev).
                </p>
                <label className="mb-1 block text-xs text-on-surface-variant">Summary length</label>
                <select
                  value={prefs.summaryLength}
                  onChange={(e) => setPrefs({ ...prefs, summaryLength: e.target.value })}
                  className="glass-input mb-4 w-full rounded-lg px-3 py-2 text-sm md:w-1/2"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="detailed">Detailed</option>
                </select>
                <Toggle label="Auto-summarization" checked={prefs.autoSummary} onChange={(v) => setPrefs({ ...prefs, autoSummary: v })} />
                <Toggle label="Keyword extraction" checked={prefs.keywordExtraction} onChange={(v) => setPrefs({ ...prefs, keywordExtraction: v })} hint="Adds keyword highlights at the top of the transcript." />
                <Toggle label="Auto translate" checked={prefs.autoTranslate} onChange={(v) => setPrefs({ ...prefs, autoTranslate: v })} />
                {prefs.autoTranslate && (
                  <select
                    value={prefs.translateLanguage}
                    onChange={(e) => setPrefs({ ...prefs, translateLanguage: e.target.value })}
                    className="glass-input mt-2 w-full rounded-lg px-3 py-2 text-sm md:w-1/2"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                )}
              </div>
            </section>
          )}

          {tab === 'Integrations' && (
            <section className="glass-panel rounded-xl p-6">
              <h3 className="mb-4 text-xl font-semibold">Integrations</h3>
              <p className="text-sm text-primary">
                Supabase powers auth and history. Apify handles transcript extraction. Configure keys in your{' '}
                <code className="rounded bg-surface-container px-1">.env</code> file.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-on-surface">
                  <Icon name="check_circle" className="text-primary" />
                  Supabase connected
                </li>
                <li className="flex items-center gap-2 text-on-surface">
                  <Icon name="check_circle" className="text-primary" />
                  YouTube via Apify
                </li>
              </ul>
            </section>
          )}

          {tab === 'Notifications' && (
            <section className="glass-panel rounded-xl p-6">
              <h3 className="mb-4 text-xl font-semibold">Notifications</h3>
              <p className="text-sm text-primary">
                Get alerted when transcription finishes, even if you are on another tab.
              </p>
              <Toggle
                label="Notify when transcription completes"
                checked={prefs.notifyOnComplete}
                onChange={(v) => setPrefs({ ...prefs, notifyOnComplete: v })}
                hint="Shows a browser notification when processing finishes in the background."
              />
              <button
                type="button"
                onClick={enableBrowserNotifications}
                className="mt-4 rounded-lg border border-primary/30 bg-gradient-accent-soft px-4 py-2 text-sm font-semibold text-primary"
              >
                Enable browser notifications
              </button>
              {notifyStatus && <p className="mt-3 text-sm text-primary">{notifyStatus}</p>}
              <p className="mt-4 text-xs text-on-surface-variant">
                Current permission:{' '}
                {typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
