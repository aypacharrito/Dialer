import {inlineMessageMedia} from './message-audio';
/** Byte ranges let native audio controls seek without downloading the clip again. */
export function messageMediaResponse(request: Request, item: {name: string; type: string}, data: ArrayBuffer, history = false) {
  const bytes = new Uint8Array(data), size = bytes.byteLength;
  const headers = new Headers({
    'Content-Type': item.type || 'application/octet-stream',
    'Content-Disposition': `${new URL(request.url).searchParams.get('download') !== '1' && inlineMessageMedia(item.type) ? 'inline' : 'attachment'}; filename="${item.name.replace(/["\\\r\n]/g, '')}"`,
    'Accept-Ranges': 'bytes', 'Content-Length': String(size),
    'Cache-Control': history ? 'private, no-store' : 'public, max-age=900, immutable',
    'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff',
  });
  const head = request.method === 'HEAD';
  const range = head ? null : request.headers.get('range');
  if (!range) return new Response(head ? null : bytes, {status: 200, headers});
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  let start = 0, end = size - 1;
  if (match && (match[1] || match[2])) {
    if (match[1]) { start = Number(match[1]); if (match[2]) end = Math.min(Number(match[2]), size - 1); }
    else start = Math.max(0, size - Number(match[2]));
  }
  if (!match || (!match[1] && !match[2]) || !size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start || (!match[1] && Number(match[2]) === 0)) {
    headers.set('Content-Range', `bytes */${size}`); headers.set('Content-Length', '0');
    return new Response(null, {status: 416, headers});
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`); headers.set('Content-Length', String(end - start + 1));
  return new Response(bytes.slice(start, end + 1), {status: 206, headers});
}
