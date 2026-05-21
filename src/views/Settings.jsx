import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { getDisplayName, getInitials } from '../lib/profile';
import { trialDaysLeft } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

const PREFS_KEY = 'tubescribe_prefs';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Settings({ session, profile, onProfileUpdate }) {
  const [prefs, setPrefs] = useState({
    language: 'en',
    autoSummary: true,
    timestampFormat: 'full',
    ...loadPrefs(),
  });
  const [displayName, setDisplayName] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const daysLeft = trialDaysLeft(profile?.trialEndsAt);
  const email = session?.user?.email || 'Not signed in';

  useEffect(() => {
    setDisplayName(getDisplayName(session, profile));
  }, [session?.user?.id, profile?.displayName, session?.user?.user_metadata?.display_name]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
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

    let { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        display_name: trimmed,
      }, { onConflict: 'id' });

    if (profileError) {
      ({ error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
        }, { onConflict: 'id' }));
    }

    setSavingName(false);

    if (profileError) {
      setAccountStatus(profileError.message);
      return;
    }

    onProfileUpdate?.({ displayName: trimmed });
    setAccountStatus('Display name saved.');
    setTimeout(() => setAccountStatus(''), 3000);
  }

  const initials = getInitials(displayName, email);

  return (
    <div className="mx-auto max-w-[var(--spacing-container-max)]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface md:text-3xl">Settings</h2>
        <p className="mt-2 text-secondary">Manage your account preferences and integration details.</p>
        {prefsSaved && (
          <p className="mt-2 text-sm font-semibold text-primary">Preferences saved.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav className="flex gap-2 overflow-x-auto pb-4 lg:flex-col lg:overflow-visible lg:pb-0">
            {['Account', 'Transcription', 'Integrations', 'Notifications'].map((tab, i) => (
              <span
                key={tab}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${
                  i === 0
                    ? 'bg-surface-container-highest font-bold text-on-surface'
                    : 'text-on-surface-variant'
                }`}
              >
                {tab}
              </span>
            ))}
          </nav>
        </aside>

        <div className="space-y-8 lg:col-span-9">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-ambient">
            <h3 className="mb-6 border-b border-outline-variant pb-2 text-xl font-semibold">Account Details</h3>
            <div className="mb-8 flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary-fixed text-2xl font-bold text-primary">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{displayName || 'Your name'}</p>
                <p className="text-sm text-on-surface-variant">{email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you want to be called"
                  maxLength={48}
                  className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Email</label>
                <input
                  type="email"
                  readOnly
                  value={email}
                  className="w-full rounded-lg border border-outline bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveDisplayName}
                disabled={savingName || !session}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {savingName ? 'Saving…' : 'Save display name'}
              </button>
              {accountStatus && (
                <span className={`text-sm ${accountStatus.includes('saved') ? 'text-primary font-semibold' : 'text-error'}`}>
                  {accountStatus}
                </span>
              )}
            </div>
            <div className="mt-8 flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <div>
                <h4 className="font-bold text-on-surface">
                  {daysLeft > 0 ? 'Unlimited trial' : 'Free plan'}
                </h4>
                <p className="text-sm text-on-surface-variant">
                  {daysLeft > 0
                    ? `${daysLeft} days of unlimited transcripts remaining.`
                    : '1 transcript per day after trial.'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
              >
                Manage Billing
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-ambient">
            <h3 className="mb-6 border-b border-outline-variant pb-2 text-xl font-semibold">
              Transcription Preferences
            </h3>
            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Default language</label>
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                  className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm md:w-1/2"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Spanish (ES)</option>
                  <option value="fr">French (FR)</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="font-bold text-on-surface">Auto-summarization</h4>
                  <p className="text-sm text-on-surface-variant">
                    Show excerpt summary on the dashboard after transcription.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={prefs.autoSummary}
                    onChange={(e) => setPrefs({ ...prefs, autoSummary: e.target.checked })}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-surface-variant after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
                </label>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-on-surface-variant">Timestamp format</label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="timestamp"
                      checked={prefs.timestampFormat === 'full'}
                      onChange={() => setPrefs({ ...prefs, timestampFormat: 'full' })}
                      className="text-primary"
                    />
                    <span className="text-sm">[00:00:00]</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="timestamp"
                      checked={prefs.timestampFormat === 'short'}
                      onChange={() => setPrefs({ ...prefs, timestampFormat: 'short' })}
                      className="text-primary"
                    />
                    <span className="text-sm">00:00</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-ambient">
            <h3 className="mb-4 text-xl font-semibold">Integrations</h3>
            <p className="text-sm text-secondary">
              Supabase powers auth and history. Apify handles transcript extraction. Configure keys in your{' '}
              <code className="rounded bg-surface-container px-1">.env</code> file.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Icon name="check_circle" className="text-primary" />
                Supabase connected
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check_circle" className="text-primary" />
                YouTube via Apify
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
