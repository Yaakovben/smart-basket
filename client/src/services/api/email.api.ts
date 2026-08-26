import apiClient from './client';

export interface EmailUserStatus {
  userId: string;
  name: string;
  email: string;
  status: 'sent' | 'failed' | 'skipped';
}

export interface BroadcastEmailResult {
  totalUsers: number;
  sent: number;
  failed: number;
  skipped: number;
  perUser: EmailUserStatus[];
}

export interface SendEmailResult {
  sent: boolean;
  email: string;
}

const getEmailStatus = async (): Promise<boolean> => {
  try {
    const r = await apiClient.get<{ data: { enabled: boolean } }>('/email/status');
    return r.data.data.enabled;
  } catch {
    return false;
  }
};

const broadcastEmail = async (subject: string, body: string, onlyWithoutPush: boolean): Promise<BroadcastEmailResult> => {
  const r = await apiClient.post<{ data: BroadcastEmailResult }>('/email/broadcast', { subject, body, onlyWithoutPush });
  return r.data.data;
};

const sendEmailToUser = async (userId: string, subject: string, body: string): Promise<SendEmailResult> => {
  const r = await apiClient.post<{ data: SendEmailResult }>('/email/send-to-user', { userId, subject, body });
  return r.data.data;
};

export const emailApi = { getEmailStatus, broadcastEmail, sendEmailToUser };
