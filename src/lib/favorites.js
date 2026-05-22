const FAVORITES_KEY = 'tubescribe_favorite_ids';

let dbFavoritesSupported = null;

export function setDbFavoritesSupported(supported) {
  dbFavoritesSupported = supported;
}

export function isDbFavoritesSupported() {
  return dbFavoritesSupported === true;
}

export function loadLocalFavoriteIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

export function saveLocalFavoriteIds(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

export function clearLocalFavoriteIds() {
  localStorage.removeItem(FAVORITES_KEY);
}

export function applyFavoriteFlags(items) {
  const local = loadLocalFavoriteIds();
  return (items || []).map((item) => ({
    ...item,
    is_favorite: dbFavoritesSupported
      ? Boolean(item.is_favorite) || local.has(item.id)
      : local.has(item.id),
  }));
}

export function isFavorite(item) {
  if (!item?.id) return false;
  if (dbFavoritesSupported) {
    return Boolean(item.is_favorite) || loadLocalFavoriteIds().has(item.id);
  }
  return loadLocalFavoriteIds().has(item.id);
}

export function setLocalFavorite(id, favorited) {
  const local = loadLocalFavoriteIds();
  if (favorited) local.add(id);
  else local.delete(id);
  saveLocalFavoriteIds(local);
}

/** Returns false when Supabase is missing the is_favorite column. */
export async function probeFavoritesColumn(supabase, userId) {
  const { error } = await supabase
    .from('transcript_history')
    .select('id, is_favorite')
    .eq('user_id', userId)
    .limit(1);

  if (!error) return true;

  const msg = (error.message || '').toLowerCase();
  const code = String(error.code || '');
  if (
    code === '42703'
    || msg.includes('is_favorite')
    || (msg.includes('column') && msg.includes('does not exist'))
  ) {
    return false;
  }

  return true;
}
