/**
 * API client for POST /api/check.
 * All Axios calls are centralised here — components do not call axios directly.
 */
import axios from 'axios';
import type { CheckResponse, ApiErrorResponse } from '../types/api';

/** Typed error thrown when the backend returns a non-2xx response. */
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
 * Timeout is 90 seconds to accommodate GPT processing time.
 */
export async function checkDocument(file: File): Promise<CheckResponse> {
  const form = new FormData();
  form.append('file', file);

  try {
    const { data } = await axios.post<CheckResponse>('/api/check', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90_000,
    });
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as ApiErrorResponse | undefined;
      throw new DocumentCheckError(body?.error ?? err.message, err.response?.status);
    }
    throw err;
  }
}
