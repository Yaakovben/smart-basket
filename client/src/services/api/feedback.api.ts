import apiClient from './client';

export const feedbackApi = {
  /** שולח משוב חד-פעמי של המשתמש (דירוג 1-5 + הודעה חופשית אופציונלית). */
  async submit(rating: number, message?: string): Promise<void> {
    await apiClient.post('/feedback', { rating, message: message ?? '' });
  },
};
