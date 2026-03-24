/**
 * API client for POST /api/check.
 *
 * The backend responds with a Server-Sent Events stream:
 *   event: progress  { message: string }   — pipeline step update
 *   event: result    CheckResponse         — final validated payload
 *   event: error     { error: string }     — pipeline failure
 *
 * HTTP-level errors (multer 400/413) are returned before the SSE stream
 * opens, so we check res.ok first and fall back to JSON parsing for those.
 */
import type { CheckResponse, ApiErrorResponse } from '../types/api';

/** Typed error thrown when the backend returns a non-2xx response or an SSE error event. */
export class DocumentCheckError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'DocumentCheckError';
    this.statusCode = statusCode;
  }
}

/**
 * Upload a .docx File to the backend and return the APA7 validation results.
 *
 * @param file        The .docx file to validate.
 * @param onProgress  Optional callback called with each progress message as the
 *                    pipeline runs — use this to drive a live progress log in the UI.
 */
export async function checkDocument(
  file: File,
  onProgress?: (message: string) => void
): Promise<CheckResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/check', { method: 'POST', body: form });

  // HTTP errors (400/413) arrive before SSE headers — parse them as JSON.
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as ApiErrorResponse;
      if (body.error) message = body.error;
    } catch {
      // ignore JSON parse failure — use the default message
    }
    throw new DocumentCheckError(message, res.status);
  }

  // Read the SSE stream incrementally.
  const reader = res.body?.getReader();
  if (!reader) throw new DocumentCheckError('No response body received');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by double newlines.
    const messages = buffer.split('\n\n');
    // Keep any incomplete trailing fragment in the buffer.
    buffer = messages.pop() ?? '';

    for (const message of messages) {
      let eventType = 'message';
      let dataLine = '';

      for (const line of message.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
      }

      if (!dataLine) continue;

      const payload = JSON.parse(dataLine) as Record<string, unknown>;

      if (eventType === 'progress') {
        onProgress?.(String(payload.message ?? ''));
      } else if (eventType === 'result') {
        return payload as unknown as CheckResponse;
      } else if (eventType === 'error') {
        throw new DocumentCheckError(String(payload.error ?? 'Unknown error'));
      }
    }
  }

  throw new DocumentCheckError('Stream closed without returning a result.');
}
