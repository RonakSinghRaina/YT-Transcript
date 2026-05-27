import { createServerSupabase } from '../lib/supabaseServer.mjs';
import { resolveServerSupabaseCredentials } from '../lib/supabaseConfig.mjs';
import { buildVideoSummary } from '../lib/summary.mjs';
import { applyCors } from '../lib/cors.mjs';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export async function processSummaryRequest({ accessToken, body }) {
  if (!accessToken) {
    const error = new Error('Please log in.');
    error.status = 401;
    throw error;
  }

  const { supabaseUrl, supabaseAnonKey } = resolveServerSupabaseCredentials();
  const supabase = createServerSupabase(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    const error = new Error('Invalid session.');
    error.status = 401;
    throw error;
  }

  let transcript = body.transcript || '';
  let title = body.title || '';
  let description = body.description || '';

  if (body.transcriptId) {
    const { data: row, error } = await supabase
      .from('transcript_history')
      .select('id, user_id, transcript, title, summary')
      .eq('id', body.transcriptId)
      .maybeSingle();

    const fallbackTranscriptProvided = Boolean(String(body.transcript || '').trim());
    if (error || !row || row.user_id !== userData.user.id) {
      // If caller already sent transcript text, continue instead of hard-failing on missing row.
      if (fallbackTranscriptProvided) {
        transcript = String(body.transcript || '').trim();
        title = body.title || title;
      } else {
        const err = new Error('Transcript not found.');
        err.status = 404;
        throw err;
      }
    } else {
      if (row.summary?.overview && body.force !== true) {
        return { summary: row.summary };
      }

      transcript = row.transcript || transcript;
      title = row.title || title;
    }
  }

  if (!transcript) {
    const err = new Error('Transcript text is required.');
    err.status = 400;
    throw err;
  }

  const summary = await buildVideoSummary(transcript, {
    length: body.summaryLength || 'medium',
    enabled: body.autoSummary !== false,
    title,
    description,
  });

  if (body.transcriptId && summary) {
    await supabase
      .from('transcript_history')
      .update({ summary })
      .eq('id', body.transcriptId)
      .eq('user_id', userData.user.id);
  }

  return { summary };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const payload = await processSummaryRequest({
      accessToken: getBearerToken(req),
      body,
    });
    json(res, 200, payload);
  } catch (error) {
    json(res, error.status || 500, { error: error.message || 'Summary failed.' });
  }
}
