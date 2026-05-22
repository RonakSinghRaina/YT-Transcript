/** Remove caption timestamps like [00:00:00] or inline 0:15 markers. */
export function stripTimestamps(text) {
  return String(text || '')
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, ' ')
    .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, ' ')
    .replace(/(?:^|\s)\d{1,2}:\d{2}(?::\d{2})?\s+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function trimEnvKey(value) {
  const raw = String(value || '').trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

export function getOpenAiKey() {
  const key = trimEnvKey(process.env.OPENAI_API_KEY);
  return key && key !== 'placeholder' && key.length > 10 ? key : null;
}

export function getGeminiKey() {
  const key = trimEnvKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  return key && key !== 'placeholder' && key.length > 10 ? key : null;
}

const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

function geminiModelsToTry() {
  const preferred = trimEnvKey(process.env.GEMINI_SUMMARY_MODEL);
  const models = preferred ? [preferred, ...GEMINI_MODEL_FALLBACKS] : [...GEMINI_MODEL_FALLBACKS];
  return [...new Set(models.filter(Boolean))];
}

function lengthGuide(length) {
  if (length === 'short') {
    return 'Write exactly 1 paragraph (5–6 sentences) covering opening, main points, and conclusion.';
  }
  if (length === 'detailed') {
    return 'Write exactly 3 paragraphs (12–15 sentences total): paragraph 1 = opening; paragraph 2 = main crux and key details; paragraph 3 = conclusions and takeaways.';
  }
  return 'Write exactly 2 paragraphs (7–9 sentences total): paragraph 1 = how the video starts and what it sets up; paragraph 2 = the main crux, major points, and how it concludes.';
}

const SUMMARY_SYSTEM_RULES =
  'You summarize YouTube videos for someone who will NOT watch the video. ' +
  'Return JSON only: {"overview":"..."}. ' +
  'PARAPHRASE in fresh prose — never copy transcript wording, never use direct quotes, never paste sentence fragments from the speaker. ' +
  'Do not use phrases like "The creator introduces" or "The speaker then discusses" followed by clipped transcript text. ' +
  'Write in third person (This video, The creator, The presenter). ' +
  'Synthesize themes, arguments, and takeaways; only include specific names, exercises, or steps when they are central. ' +
  'Use ONLY facts supported by the transcript and title — do not invent content. ' +
  'No bullet lists, no headings, no timestamps, no first-person pronouns.';

function splitSentences(text) {
  return stripTimestamps(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 420);
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

function buildContextBlock({ title, description }) {
  const parts = [];
  if (title) parts.push(`Video title: ${title}`);
  if (description) parts.push(`Video description: ${String(description).slice(0, 600)}`);
  return parts.length ? `${parts.join('\n')}\n\n` : '';
}

async function callOpenAiJson({ apiKey, system, user, temperature = 0.35 }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini',
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

async function callGeminiJson({ apiKey, system, user, temperature = 0.35 }) {
  let lastError = null;

  for (const model of geminiModelsToTry()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      lastError = new Error(payload?.error?.message || `Gemini summary failed (${model}).`);
      const retryable = response.status === 429 || response.status === 503 || response.status === 404;
      if (retryable) continue;
      throw lastError;
    }

    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(raw);
  }

  throw lastError || new Error('Gemini summary failed.');
}

function validateOverview(overview) {
  const text = stripTimestamps(String(overview || '')).trim();
  if (!text || text.length < 80) {
    throw new Error('Summary too short.');
  }
  if (/The (creator|speaker) (introduces|then discusses|covers)/i.test(text)) {
    throw new Error('Summary looked like clipped transcript text.');
  }
  return text;
}

async function summarizeChunks(points, { title, description, length, provider, apiKey }) {
  const system = `${SUMMARY_SYSTEM_RULES} ${lengthGuide(length)} Separate paragraphs with a blank line (\\n\\n).`;

  const user =
    `${buildContextBlock({ title, description })}` +
    'Factual notes extracted from the transcript (use these ideas, do not copy their wording):\n' +
    `${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

  const parsed =
    provider === 'gemini'
      ? await callGeminiJson({ apiKey, system, user })
      : await callOpenAiJson({ apiKey, system, user });

  return validateOverview(parsed.overview);
}

async function extractSectionPoints(chunk, meta, provider, apiKey) {
  const system =
    'Extract neutral factual notes from this transcript section. Return JSON: {"points":["..."]}. ' +
    'Each point is one short third-person note about a topic or idea (not a quote). No timestamps, no invented facts.';

  const user = `${buildContextBlock(meta)}Transcript section:\n${chunk}`;

  const parsed =
    provider === 'gemini'
      ? await callGeminiJson({ apiKey, system, user })
      : await callOpenAiJson({ apiKey, system, user });

  return (parsed.points || []).map((p) => String(p).trim()).filter(Boolean);
}

async function buildLlmSummary(text, { length, title, description, provider, apiKey }) {
  const clean = stripTimestamps(text);
  if (!clean) throw new Error('Transcript is empty.');

  const meta = { title, description };
  const chunks = splitIntoChunks(clean, 10000);
  const system = `${SUMMARY_SYSTEM_RULES} ${lengthGuide(length)} Separate paragraphs with a blank line (\\n\\n).`;

  if (chunks.length === 1) {
    const user = `${buildContextBlock(meta)}Transcript:\n${clean.slice(0, 14000)}`;
    const parsed =
      provider === 'gemini'
        ? await callGeminiJson({ apiKey, system, user })
        : await callOpenAiJson({ apiKey, system, user });

    return { overview: validateOverview(parsed.overview), sections: [], source: provider };
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
  return { overview, sections: [], source: provider };
}

export async function buildAiSummary(text, apiKey, length = 'medium', title = '', description = '') {
  return buildLlmSummary(text, { length, title, description, provider: 'openai', apiKey });
}

export async function buildGeminiSummary(text, apiKey, length = 'medium', title = '', description = '') {
  return buildLlmSummary(text, { length, title, description, provider: 'gemini', apiKey });
}

/** Minimal fallback when no AI keys are configured (not shown as "AI summary"). */
export function buildExtractiveSummary(text, length = 'medium', title = '') {
  const clean = stripTimestamps(text);
  const videoLabel = title ? `“${title}”` : 'this video';
  const hint =
    'Add GEMINI_API_KEY or OPENAI_API_KEY in your server .env for an AI-written overview (opening, main points, and conclusion).';
  if (!clean) {
    return { overview: '', sections: [], source: 'extractive' };
  }
  return {
    overview: `A full transcript is available below for ${videoLabel}. ${hint}`,
    sections: [],
    source: 'extractive',
  };
}

export async function buildVideoSummary(
  text,
  { length = 'medium', enabled = true, title = '', description = '' } = {},
) {
  if (!enabled) return null;

  const openaiKey = getOpenAiKey();
  const geminiKey = getGeminiKey();
  const errors = [];

  if (geminiKey) {
    try {
      return await buildGeminiSummary(text, geminiKey, length, title, description);
    } catch (error) {
      console.error('[summary] Gemini failed:', error.message);
      errors.push(`Gemini: ${error.message}`);
    }
  }

  if (openaiKey) {
    try {
      return await buildAiSummary(text, openaiKey, length, title, description);
    } catch (error) {
      console.error('[summary] OpenAI failed:', error.message);
      errors.push(`OpenAI: ${error.message}`);
    }
  }

  if (geminiKey || openaiKey) {
    const err = new Error(
      errors.join(' ') ||
        'AI summary failed. Check API billing or set GEMINI_SUMMARY_MODEL=gemini-2.5-flash in .env.',
    );
    err.code = 'SUMMARY_AI_FAILED';
    throw err;
  }

  return buildExtractiveSummary(text, length, title);
}

/** @deprecated Use buildExtractiveSummary */
export function buildHeuristicSummary(text, length = 'medium', title = '') {
  return buildExtractiveSummary(text, length, title);
}
