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

    if (!isSupabaseConfigured) {
      setStatus('Add your Supabase keys to .env first.');
      setBusy(false);
      return;
    }

    const emailRedirectTo = window.location.href.split('#')[0];
    const action = mode === 'signup'
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-ambient">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-secondary hover:bg-surface-container-high"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">
          <Icon name="auto_awesome" className="text-base" />
          First generation is free
        </div>

        <h2 className="text-2xl font-bold text-on-surface">
          {mode === 'signup' ? 'Create your account' : 'Log in to TubeScribe'}
        </h2>
        <p className="mt-2 text-sm text-secondary">
          Sign in to save transcripts, view history, and manage your workspace.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="arrow_forward" />}
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        </form>

        {status && (
          <p className="mt-4 rounded-xl bg-error-container px-3 py-2 text-sm text-error">{status}</p>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          className="mt-4 w-full text-sm font-semibold text-primary hover:underline"
        >
          {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create account'}
        </button>
      </div>
    </div>
  );
}
