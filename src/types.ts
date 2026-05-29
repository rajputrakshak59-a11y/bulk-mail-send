export interface Recipient {
  id: string;
  name: string;
  email: string;
  variables: Record<string, string>; // Extra variables for dynamic templates e.g. company, phone etc.
  customSubject?: string; // Client specific subject override
  customBody?: string; // Client specific body override
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
  sentBySenderEmail?: string;
  sentAt?: string;
}

export interface MailSenderSettings {
  id: string;
  email: string;
  appPassword: string; // 16 digit app password
  dailyLimit: number; // typically 25 or customized
  sentToday: number;
  status: 'active' | 'invalid' | 'rate-limited';
  error?: string;
}

export interface MailCampaign {
  id: string;
  subject: string;
  body: string; // supports {name} and other custom variables
  senders: MailSenderSettings[];
  recipients: Recipient[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentIndex: number;
  createdTime: string;
  delayMs?: number;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  sending: number;
}
