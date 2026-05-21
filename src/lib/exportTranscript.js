import { segmentsWithTimestamps } from './transcriptUtils';

function safeFilename(title) {
  return (title || 'transcript')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 48)
    .replace(/\s+/g, '-') || 'transcript';
}

function buildPlainText(result) {
  const title = result?.title || 'Transcript';
  const videoUrl = result?.video_url || '';
  const transcript = result?.transcript || '';
  const segments = segmentsWithTimestamps(transcript);

  const lines = [`${title}`, videoUrl ? `Source: ${videoUrl}` : '', '', '--- Transcript ---', ''];

  if (segments.length) {
    for (const seg of segments) {
      lines.push(`[${seg.time}] ${seg.body}`);
      lines.push('');
    }
  } else {
    lines.push(transcript);
  }

  return lines.filter((l, i, arr) => !(l === '' && arr[i + 1] === '')).join('\n');
}

export function downloadTranscriptTxt(result) {
  const text = buildPlainText(result);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename(result?.title)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTranscriptPdf(result) {
  const title = result?.title || 'Transcript';
  const videoUrl = result?.video_url || '';
  const transcript = result?.transcript || '';
  const segments = segmentsWithTimestamps(transcript);

  const bodyHtml = segments.length
    ? segments
        .map(
          (seg) =>
            `<p style="margin:0 0 12px;"><strong style="color:#842bd2;">[${seg.time}]</strong> ${escapeHtml(seg.body)}</p>`
        )
        .join('')
    : `<p style="white-space:pre-wrap;line-height:1.6;">${escapeHtml(transcript)}</p>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a1a1a; padding: 40px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${videoUrl ? `<p class="meta">${escapeHtml(videoUrl)}</p>` : ''}
  <hr />
  ${bodyHtml}
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Allow pop-ups to export PDF, or use Download TXT.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
