import { TreasureId, VoucherIssue } from './treasureCatalog';

export interface CampaignState {
  serverNow: number;
  festivalStartAt: string | null;
  passesRemaining: number;
  voucherValidityHours: number;
}

export interface RemoteHunt {
  id: string;
  startedAt: number;
  deadlineAt: number;
  durationMs: number;
  variant: 'timer_20' | 'timer_30';
  points: Record<TreasureId, number>;
}

export interface CollectResponse {
  treasureId: TreasureId;
  points: number;
  bonus: number;
  score: number;
  foundCount: number;
}

export interface CompleteResponse {
  id: string;
  score: number;
  baseScore: number;
  comboBonus: number;
  comboCount: number;
  foundCount: number;
  tier: string;
  durationMs: number;
  variant: string;
  needsLead: boolean;
}

export interface LeadClaim {
  contactType: 'email' | 'phone';
  contact: string;
  privacyAccepted: boolean;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Servizio temporaneamente non disponibile');
  return body;
}

export const campaignApi = {
  get: () => request<CampaignState>('/api/campaign'),
  startHunt: (referralId: string, incomingReferral?: string | null) =>
    request<RemoteHunt>('/api/hunts/start', {
      method: 'POST',
      body: JSON.stringify({ referralId, incomingReferral }),
    }),
  collect: (sessionId: string, treasureId: TreasureId) =>
    request<CollectResponse>(`/api/hunts/${encodeURIComponent(sessionId)}/collect`, {
      method: 'POST',
      body: JSON.stringify({ treasureId }),
    }),
  complete: (sessionId: string) =>
    request<CompleteResponse>(`/api/hunts/${encodeURIComponent(sessionId)}/complete`, {
      method: 'POST', body: '{}',
    }),
  claim: (sessionId: string, lead: LeadClaim) =>
    request<{ vouchers: VoucherIssue[]; passesRemaining: number }>(
      `/api/hunts/${encodeURIComponent(sessionId)}/claim`,
      { method: 'POST', body: JSON.stringify(lead) }
    ),
};

export function trackEvent(
  event: string,
  context: { sessionId?: string | null; variant?: string | null; properties?: Record<string, unknown> } = {}
): void {
  const payload = JSON.stringify({ event, ...context });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true });
}
