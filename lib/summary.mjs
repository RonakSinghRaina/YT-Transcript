/** Remove caption timestamps like [00:00:00] or inline 0:15 markers. */
export function stripTimestamps(text) {
  return String(text || '')
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, ' ')
    .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, ' ')
    .replace(/(?:^|\s)\d{1,2}:\d{2}(?::\d{2})?\s+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'that',
  'this', 'these', 'those', 'it', 'its', 'as', 'from', 'into', 'about', 'than', 'then', 'so',
  'if', 'when', 'where', 'how', 'what', 'which', 'who', 'why', 'just', 'like', 'really', 'very',
  'also', 'yeah', 'yes', 'no', 'not', 'don', 'know', 'think', 'going', 'gonna', 'want', 'get',
  'you', 'your', 'youtube', 'video', 'subscribe', 'channel',
]);

function tokenize(text) {
  return stripTimestamps(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function splitSentences(text) {
  return stripTimestamps(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 420);
}

function isWeakSentence(sentence) {
  const s = sentence.trim();
  if (s.startsWith('>>')) return true;
  if (/^["'“]/.test(s)) return true;
  if (/\b(uh|um|erm)\b/i.test(s)) return true;
  if (/^(okay|so|well|yeah|right|now|look),?\s/i.test(s)) return true;
  const words = s.split(/\s+/).length;
  if (words < 6) return true;
  return false;
}

function computeWordFreq(sentences) {
  const freq = {};
  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }
  return freq;
}

function scoreSentence(sentence, wordFreq) {
  const tokens = tokenize(sentence);
  if (!tokens.length) return 0;
  const tf = tokens.reduce((sum, w) => sum + (wordFreq[w] || 0), 0) / tokens.length;
  const lenPenalty = Math.abs(sentence.length - 140) / 300;
  return tf - lenPenalty;
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  return intersection / (setA.size + setB.size - intersection);
}

/** Pick diverse, central sentences from the transcript (extractive summarization). */
function selectRepresentativeSentences(text, count) {
  const indexed = splitSentences(text)
    .map((sentence, index) => ({ sentence, index }))
    .filter(({ sentence }) => !isWeakSentence(sentence));

  if (!indexed.length) return [];

  const sentences = indexed.map((x) => x.sentence);
  const wordFreq = computeWordFreq(sentences);
  const relevance = sentences.map((s) => scoreSentence(s, wordFreq));

  const selected = [];
  const used = new Set();
  const lambda = 0.72;

  let firstIdx = 0;
  let best = -Infinity;
  for (let i = 0; i < relevance.length; i += 1) {
    if (relevance[i] > best) {
      best = relevance[i];
      firstIdx = i;
    }
  }
  selected.push(sentences[firstIdx]);
  used.add(firstIdx);

  while (selected.length < count && used.size < sentences.length) {
    let pickIdx = -1;
    let pickScore = -Infinity;

    for (let i = 0; i < sentences.length; i += 1) {
      if (used.has(i)) continue;
      const redundancy = Math.max(
        0,
        ...selected.map((s) => jaccardSimilarity(s, sentences[i])),
      );
      const mmr = lambda * relevance[i] - (1 - lambda) * redundancy;
      if (mmr > pickScore) {
        pickScore = mmr;
        pickIdx = i;
      }
    }

    if (pickIdx < 0) break;
    selected.push(sentences[pickIdx]);
    used.add(pickIdx);
  }

  return indexed
    .filter(({ sentence }) => selected.includes(sentence))
    .sort((a, b) => a.index - b.index)
    .map(({ sentence }) => sentence);
}

function clauseFromSentence(sentence) {
  let s = sentence.replace(/^>>\s*/, '').trim();
  s = s.replace(/^(Okay|So|Well|Yeah|Right|Now|Look),?\s*/i, '');
  s = s.replace(/^Today we\s+/i, 'the video ');
  s = s.replace(/^In this video,?\s*/i, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.endsWith('.')) return s.slice(0, -1);
  return s;
}

function lengthSentenceCount(length) {
  if (length === 'short') return 4;
  if (length === 'detailed') return 10;
  return 6;
}

/** Grounded fallback: only uses real transcript sentences, ordered as in the video. */
export function buildExtractiveSummary(text, length = 'medium', title = '') {
  const clean = stripTimestamps(text);
  if (!clean) {
    return { overview: '', sections: [], source: 'extractive' };
  }

  const count = lengthSentenceCount(length);
  const picks = selectRepresentativeSentences(clean, count);
  const videoLabel = title ? `This video (“${title}”)` : 'This video';

  if (!picks.length) {
    return {
      overview: `${videoLabel} covers topics discussed in the recording. Open the transcript below to read the full content.`,
      sections: [],
      source: 'extractive',
    };
  }

  const clauses = picks.map(clauseFromSentence);
  const intro = `${videoLabel} summarizes the following based on the transcript:`;

  if (length === 'short') {
    const body = clauses.slice(0, 3).map((c) => `The video explains ${c}.`).join(' ');
    return { overview: `${intro} ${body}`, sections: [], source: 'extractive' };
  }

  const mid = Math.ceil(clauses.length / 2);
  const p2 = clauses
    .slice(0, mid)
    .map((c, i) => (i === 0 ? `The creator introduces ${c}.` : `The speaker then discusses ${c}.`))
    .join(' ');
  const p3 = clauses
    .slice(mid)
    .map((c) => `Later, the video covers ${c}.`)
    .join(' ');

  const closing =
    length === 'detailed'
      ? 'Together, these points reflect the main narrative arc of the recording from start to finish.'
      : '';

  return {
    overview: [intro, p2, p3, closing].filter(Boolean).join('\n\n'),
    sections: [],
    source: 'extractive',
  };
}

function splitIntoChunks(text, maxLen = 10000) {
  if (text.length <= maxLen) return [text];
  const sentences = splitSentences(text);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

function lengthGuide(length) {
  if (length === 'short') return 'Write 1 paragraph (4–5 sentences).';
  if (length === 'detailed') return 'Write 3 paragraphs (12–15 sentences total).';
  return 'Write 2 paragraphs (7–9 sentences total).';
}

async function callOpenAiJson({ apiKey, model, system, user, temperature = 0.25 }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini',
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI summary failed.');
  }

  const raw = payload?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

async function callGeminiJson({ apiKey, system, user }) {
  const model = process.env.GEMINI_SUMMARY_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Gemini summary failed.');
  }

  const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(raw);
}

function buildContextBlock({ title, description }) {
  const parts = [];
  if (title) parts.push(`Video title: ${title}`);
  if (description) parts.push(`Video description: ${String(description).slice(0, 600)}`);
  return parts.length ? `${parts.join('\n')}\n\n` : '';
}

async function summarizeChunks(points, { title, description, length, provider, apiKey }) {
  const system =
    `You write accurate YouTube video summaries. Return JSON only: {"overview":"..."}. ${lengthGuide(length)} ` +
    'Write in third person ("This video", "The creator", "The speaker"). ' +
    'Use ONLY facts from the section notes — do not invent topics, names, or claims. ' +
    'No bullet lists, no headings, no timestamps, no first-person pronouns.';

  const user = `${buildContextBlock({ title, description })}Section notes from the transcript:\n${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

  const parsed =
    provider === 'gemini'
      ? await callGeminiJson({ apiKey, system, user })
      : await callOpenAiJson({ apiKey, system, user });

  return stripTimestamps(String(parsed.overview || ''));
}

async function extractSectionPoints(chunk, meta, provider, apiKey) {
  const system =
    'Extract factual notes from this transcript section. Return JSON: {"points":["..."]}. ' +
    'Each point is one third-person sentence about what is discussed. No quotes, no timestamps, no invented facts.';

  const user = `${buildContextBlock(meta)}Transcript section:\n${chunk}`;

  const parsed =
    provider === 'gemini'
      ? await callGeminiJson({ apiKey, system, user })
      : await callOpenAiJson({ apiKey, system, user });

  return (parsed.points || []).map((p) => String(p).trim()).filter(Boolean);
}

async function buildLlmSummary(text, { length, title, description, provider, apiKey }) {
  const clean = stripTimestamps(text);
  if (!clean) return buildExtractiveSummary(text, length, title);

  const meta = { title, description };
  const chunks = splitIntoChunks(clean, 10000);

  if (chunks.length === 1) {
    const system =
      `You write accurate YouTube video summaries. Return JSON only: {"overview":"..."}. ${lengthGuide(length)} ` +
      'Third person only. Use ONLY the transcript content. No invented facts.';

    const user = `${buildContextBlock(meta)}Transcript:\n${clean.slice(0, 14000)}`;

    const parsed =
      provider === 'gemini'
        ? await callGeminiJson({ apiKey, system, user })
        : await callOpenAiJson({ apiKey, system, user });

    const overview = stripTimestamps(String(parsed.overview || ''));
    if (!overview || overview.length < 80) {
      throw new Error('Summary too short.');
    }
    return { overview, sections: [], source: provider };
  }

  const allPoints = [];
  for (const [index, chunk] of chunks.entries()) {
    const points = await extractSectionPoints(
      chunk,
      { ...meta, title: meta.title ? `${meta.title} (part ${index + 1}/${chunks.length})` : '' },
      provider,
      apiKey,
    );
    allPoints.push(...points);
  }

  if (!allPoints.length) throw new Error('No section points extracted.');

  const overview = await summarizeChunks(allPoints, { ...meta, length, provider, apiKey });
  if (!overview || overview.length < 80) throw new Error('Merged summary too short.');

  return { overview, sections: [], source: provider };
}

export async function buildAiSummary(text, apiKey, length = 'medium', title = '', description = '') {
  return buildLlmSummary(text, { length, title, description, provider: 'openai', apiKey });
}

export async function buildGeminiSummary(text, apiKey, length = 'medium', title = '', description = '') {
  return buildLlmSummary(text, { length, title, description, provider: 'gemini', apiKey });
}

export async function buildVideoSummary(
  text,
  { length = 'medium', enabled = true, title = '', description = '' } = {},
) {
  if (!enabled) return null;

  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (openaiKey && openaiKey !== 'placeholder') {
    try {
      return await buildAiSummary(text, openaiKey, length, title, description);
    } catch (error) {
      console.error('[summary] OpenAI failed:', error.message);
    }
  }

  if (geminiKey && geminiKey !== 'placeholder') {
    try {
      return await buildGeminiSummary(text, geminiKey, length, title, description);
    } catch (error) {
      console.error('[summary] Gemini failed:', error.message);
    }
  }

  return buildExtractiveSummary(text, length, title);
}

/** @deprecated Use buildExtractiveSummary */
export function buildHeuristicSummary(text, length = 'medium', title = '') {
  return buildExtractiveSummary(text, length, title);
}
