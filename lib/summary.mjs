/** Remove caption timestamps like [00:00:00] or inline 0:15 markers. */
export function stripTimestamps(text) {
  return String(text || '')
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, ' ')
    .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, ' ')
    .replace(/(?:^|\s)\d{1,2}:\d{2}(?::\d{2})?\s+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toSentences(text) {
  return stripTimestamps(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 28);
}

function pickBullets(sentences, max = 3) {
  const scored = sentences
    .map((s) => ({
      text: s.length > 200 ? `${s.slice(0, 197)}…` : s,
      score: s.length >= 45 && s.length <= 180 ? 2 : 1,
    }))
    .sort((a, b) => b.score - a.score);

  const picked = [];
  for (const item of scored) {
    if (picked.some((p) => p.slice(0, 24) === item.text.slice(0, 24))) continue;
    picked.push(item.text);
    if (picked.length >= max) break;
  }
  return picked;
}

const SECTION_HEADINGS = [
  'Introduction',
  'Main themes',
  'Key insights',
  'Conclusion & takeaways',
];

/** Fast local summary — no API key required. */
export function buildHeuristicSummary(text) {
  const clean = stripTimestamps(text);
  const sentences = toSentences(clean);

  if (!sentences.length) {
    const fallback = clean.slice(0, 360);
    return {
      overview: fallback,
      sections: fallback
        ? [{ heading: 'Summary', bullets: [fallback] }]
        : [],
      source: 'heuristic',
    };
  }

  const overview = sentences.slice(0, 2).join(' ');
  const sectionCount = Math.min(4, Math.max(2, Math.ceil(sentences.length / 12)));
  const chunkSize = Math.ceil(sentences.length / sectionCount);
  const sections = [];

  for (let i = 0; i < sectionCount; i += 1) {
    const chunk = sentences.slice(i * chunkSize, (i + 1) * chunkSize);
    const bullets = pickBullets(chunk, 3);
    if (!bullets.length) continue;
    sections.push({
      heading: SECTION_HEADINGS[i] || `Part ${i + 1}`,
      bullets,
    });
  }

  return {
    overview: overview.length > 420 ? `${overview.slice(0, 417)}…` : overview,
    sections,
    source: 'heuristic',
  };
}

/** Optional OpenAI summary when OPENAI_API_KEY is configured. */
export async function buildAiSummary(text, apiKey) {
  const clean = stripTimestamps(text).slice(0, 14000);
  if (!clean) return buildHeuristicSummary(text);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Summarize the YouTube transcript for a creator dashboard. Return JSON only: {"overview":"2-3 sentence overview","sections":[{"heading":"short heading","bullets":["point","point"]}]}. Use 2-4 sections with 2-4 bullets each. No timestamps. Plain language.',
        },
        { role: 'user', content: clean },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI summary failed.');
  }

  const raw = payload?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(raw);
  const sections = Array.isArray(parsed.sections)
    ? parsed.sections
        .map((s) => ({
          heading: String(s.heading || 'Section').trim(),
          bullets: (Array.isArray(s.bullets) ? s.bullets : [])
            .map((b) => stripTimestamps(String(b)))
            .filter(Boolean)
            .slice(0, 5),
        }))
        .filter((s) => s.bullets.length)
    : [];

  return {
    overview: stripTimestamps(String(parsed.overview || '')),
    sections,
    source: 'openai',
  };
}

export async function buildVideoSummary(text) {
  const key = process.env.OPENAI_API_KEY;
  if (key && key !== 'placeholder') {
    try {
      return await buildAiSummary(text, key);
    } catch {
      return buildHeuristicSummary(text);
    }
  }
  return buildHeuristicSummary(text);
}
