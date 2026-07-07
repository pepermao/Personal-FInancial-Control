import { AxiosError } from 'axios';

/** Extract a human-readable error message from an unknown thrown value (Axios or otherwise). */
export function readApiError(err: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
