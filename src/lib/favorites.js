const FAVORITES_KEY = 'tubescribe_favorite_ids';

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

export function mergeFavoriteFlags(items) {
  const local = loadLocalFavoriteIds();
  return (items || []).map((item) => ({
    ...item,
    is_favorite: Boolean(item.is_favorite) || local.has(item.id),
  }));
}

export function isFavorite(item) {
  return Boolean(item?.is_favorite) || loadLocalFavoriteIds().has(item?.id);
}
