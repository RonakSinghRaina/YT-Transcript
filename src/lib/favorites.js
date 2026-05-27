import { isExtensionContext } from './extensionBridge.js';

const FAVORITES_KEY = 'tubescribe_favorite_ids';

let dbFavoritesSupported = null;
let cachedLocalIds = null;

export function setDbFavoritesSupported(supported) {
  dbFavoritesSupported = supported;
}

export function isDbFavoritesSupported() {
  return dbFavoritesSupported === true;
}

function readLocalStorageIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function writeLocalStorageIds(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

function readChromeStorageIds() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(readLocalStorageIds());
      return;
    }
    chrome.storage.local.get([FAVORITES_KEY], (data) => {
      const raw = data?.[FAVORITES_KEY];
      resolve(new Set(Array.isArray(raw) ? raw : []));
    });
  });
}

function writeChromeStorageIds(set) {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      writeLocalStorageIds(set);
      resolve();
      return;
    }
    chrome.storage.local.set({ [FAVORITES_KEY]: [...set] }, () => resolve());
  });
}

/** Load favorites into memory (call once in extension before rendering lists). */
export async function initLocalFavorites() {
  if (isExtensionContext()) {
    cachedLocalIds = await readChromeStorageIds();
  } else {
    cachedLocalIds = readLocalStorageIds();
  }
  return cachedLocalIds;
}

export function loadLocalFavoriteIds() {
  if (cachedLocalIds) return new Set(cachedLocalIds);
  return readLocalStorageIds();
}

export function saveLocalFavoriteIds(set) {
  cachedLocalIds = new Set(set);
  if (isExtensionContext()) {
    writeChromeStorageIds(cachedLocalIds);
    return;
  }
  writeLocalStorageIds(cachedLocalIds);
}

export function clearLocalFavoriteIds() {
  cachedLocalIds = new Set();
  if (isExtensionContext()) {
    writeChromeStorageIds(cachedLocalIds);
    return;
  }
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
  const local = loadLocalFavoriteIds();
  if (dbFavoritesSupported) {
    return Boolean(item.is_favorite) || local.has(item.id);
  }
  return local.has(item.id);
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
    || code === 'PGRST204'
    || (msg.includes('is_favorite') && (msg.includes('does not exist') || msg.includes('could not find')))
    || (msg.includes('column') && msg.includes('does not exist'))
  ) {
    return false;
  }

  return true;
}
