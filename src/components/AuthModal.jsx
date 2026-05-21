import { useState } from 'react';
import Icon from './Icon';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

export default function AuthModal({ mode, setMode, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus('');

    if (!isSupabaseConfigured || !supabase) {
      setStatus('Authentication is unavailable. Restart the dev server or redeploy with Supabase keys.');
      setBusy(false);
      return;
    }

    const emailRedirectTo = window.location.href.split('#')[0];
    const action =
      mode === 'signup'
        ? supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
        : supabase.auth.signInWithPassword({ email, password });

    const { data, error } = await action;
    setBusy(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (mode === 'signup' && !data?.session) {
      setStatus('Account created. Check your email, then log in.');
      setMode('login');
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel relative w-full max-w-md rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container/20 px-3 py-1 text-xs font-semibold text-primary">
          <Icon name="auto_awesome" className="text-base" />
          First generation is free
        </div>

        <h2 className="text-2xl font-bold text-on-surface">
          {mode === 'signup' ? 'Create your account' : 'Log in to TubeScribe'}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sign in to save transcripts, view history, and manage your workspace.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:ring-0"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:ring-0"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="btn-pulse flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-accent py-3 text-sm font-bold text-on-primary-container disabled:opacity-60"
          >
            {busy ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="arrow_forward" />}
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        </form>

        {status && (
          <p className="mt-4 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error">
            {status}
          </p>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          className="mt-4 w-full text-sm font-semibold text-primary transition-colors hover:text-primary-fixed"
        >
          {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create account'}
        </button>
      </div>
    </div>
  );
}
