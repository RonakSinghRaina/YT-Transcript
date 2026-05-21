export function getDisplayName(session, profile) {
  const fromProfile = profile?.displayName?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta = session?.user?.user_metadata?.display_name?.trim();
  if (fromMeta) return fromMeta;
  const email = session?.user?.email || '';
  if (email.includes('@')) return email.split('@')[0];
  return 'Creator';
}

export function getInitials(displayName, email) {
  const name = displayName?.trim();
  if (name && name.length >= 2) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'TS';
}
