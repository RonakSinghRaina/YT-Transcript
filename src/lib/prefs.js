export const PREFS_KEY = 'tubescribe_prefs';

export const DEFAULT_PREFS = {
  language: 'auto',
  timestampFormat: 'paragraph',
  timestampInterval: 30,
  speakerDetection: false,
  autoPunctuation: true,
  removeFillers: false,
  fixGrammar: false,
  improveReadability: true,
  transcriptFormat: 'paragraph',
  exportFormat: 'txt',
  summaryLength: 'medium',
  keywordExtraction: false,
  autoTranslate: false,
  translateLanguage: 'en',
  autoSummary: true,
  notifyOnComplete: true,
};

export function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function prefsToApiPayload(prefs) {
  return {
    language: prefs.language === 'auto' ? null : prefs.language,
    includeTimestamps: prefs.timestampFormat !== 'none',
    timestampFormat: prefs.timestampFormat,
    timestampInterval: prefs.timestampInterval,
    speakerDetection: prefs.speakerDetection,
    summaryLength: prefs.summaryLength,
    autoSummary: prefs.autoSummary,
    autoTranslate: prefs.autoTranslate,
    translateLanguage: prefs.translateLanguage,
  };
}
