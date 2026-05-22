import { formatTimestamp, segmentsWithTimestamps } from './transcriptUtils';

const FILLER_RE = /\b(uh|um|erm|ah|like)\b/gi;

function applyPunctuation(text) {
  let out = text.replace(/\s+/g, ' ').trim();
  if (!out) return out;
  out = out.replace(/\s+([,.!?])/g, '$1');
  if (!/[.!?]$/.test(out)) out += '.';
  return out.replace(/([.!?])\s*([a-z])/g, (_, p, c) => `${p} ${c.toUpperCase()}`);
}

function formatAsSubtitle(segments) {
  return segments
    .map((s) => `${s.time}\n${s.body}`)
    .join('\n\n');
}

function formatAsChat(segments) {
  return segments
    .map((s, i) => `Speaker ${(i % 2) + 1} (${s.time}): ${s.body}`)
    .join('\n\n');
}

function formatAsParagraph(segments) {
  return segments.map((s) => s.body).join('\n\n');
}

function resegmentWithTimestamps(text, prefs) {
  const raw = String(text || '').trim();
  if (!raw) return raw;

  if (prefs.timestampFormat === 'none') {
    return raw.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, '').replace(/\s+/g, ' ').trim();
  }

  const sentences = raw
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) return raw;

  const interval =
    prefs.timestampFormat === 'sentence'
      ? 1
      : prefs.timestampFormat === 'custom'
        ? Math.max(5, Number(prefs.timestampInterval) || 30)
        : 8;

  let cursor = 0;
  const lines = [];

  if (prefs.timestampFormat === 'paragraph') {
    const chunks = [];
    let buf = [];
    sentences.forEach((s, i) => {
      buf.push(s);
      if (buf.join(' ').length > 220 || i === sentences.length - 1) {
        chunks.push(buf.join(' '));
        buf = [];
      }
    });
    chunks.forEach((chunk) => {
      lines.push(`[${formatTimestamp(cursor)}] ${chunk}`);
      cursor += interval;
    });
  } else {
    sentences.forEach((sentence, i) => {
      if (prefs.timestampFormat === 'sentence' || i % Math.max(1, Math.floor(interval / 4)) === 0) {
        lines.push(`[${formatTimestamp(cursor)}] ${sentence}`);
        cursor += prefs.timestampFormat === 'sentence' ? 4 : interval;
      } else {
        lines.push(sentence);
      }
    });
  }

  return lines.join('\n');
}

export function applyTranscriptionPrefs(transcript, prefs) {
  if (!transcript) return transcript;

  let text = String(transcript);

  if (prefs.removeFillers) {
    text = text.replace(FILLER_RE, '').replace(/\s{2,}/g, ' ');
  }

  if (prefs.improveReadability) {
    text = text.replace(/\s+/g, ' ').trim();
  }

  if (prefs.autoPunctuation) {
    const parts = text.split(/\n+/);
    text = parts.map((p) => applyPunctuation(p)).join('\n');
  }

  text = resegmentWithTimestamps(text, prefs);

  if (prefs.transcriptFormat === 'subtitle' || prefs.transcriptFormat === 'chat') {
    const segments = segmentsWithTimestamps(text);
    text =
      prefs.transcriptFormat === 'chat'
        ? formatAsChat(segments)
        : formatAsSubtitle(segments);
  } else if (prefs.transcriptFormat === 'paragraph') {
    const segments = segmentsWithTimestamps(text);
    text = formatAsParagraph(segments);
  }

  if (prefs.keywordExtraction && text.length > 80) {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 5);
    const freq = {};
    words.forEach((w) => {
      freq[w] = (freq[w] || 0) + 1;
    });
    const top = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);
    if (top.length) {
      text = `Keywords: ${top.join(', ')}\n\n${text}`;
    }
  }

  return text.trim();
}
