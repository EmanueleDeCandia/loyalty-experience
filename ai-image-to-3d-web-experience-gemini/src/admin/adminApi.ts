export interface VoucherVerificationResult {
  valid: boolean;
  code: string;
  kind: 'pass' | 'pass_vip' | 'aperitivo' | string;
  tier: string;
  status: 'active' | 'redeemed' | 'expired' | string;
  contact?: string;
  contactType?: string;
  isPass?: boolean;
  entitlement?: string;
  expiresAt?: number;
  createdAt?: number;
  redeemedAt?: number | null;
  error?: string;
}

export interface DashboardData {
  generatedAt: number;
  kpis: {
    invited: number; contacts: number; leadsFromInvites: number; activeVouchers: number;
    redeemed: number; marketingOptIns: number; leadConversion: number; redemptionRate: number;
    inventoryRemaining?: number; dailyCap?: number; passesIssued?: number;
    passesActive?: number; passesRedeemed?: number; aperitivoActive?: number; aperitivoRedeemed?: number;
  };
  inventory?: {
    remaining: number;
    dailyCap: number;
    passesIssued: number;
    passesActive: number;
    passesRedeemed: number;
    aperitivoActive: number;
    aperitivoRedeemed: number;
  };
  funnel: { label: string; value: number }[];
  referrals: { code: string; contact: string | null; contact_type: string | null; invites: number; leads: number; vouchers: number; redeemed: number; conversion: number }[];
  abTests: { variant: string; sessions: number; completed: number; leads: number; averageScore: number; conversion: number }[];
  trend: { day: string; label: string; sessions: number; leads: number }[];
  recentLeads: {
    id: string;
    contact: string;
    contactType: string;
    marketingOptIn: number;
    whatsappOptIn: number;
    source: string;
    createdAt: number;
    personalReferralCode: string | null;
    referredByCode: string | null;
    referredByContact: string | null;
  }[];
  recentVouchers: { code: string; kind: string; tier: string; status: string; expiresAt: number; redeemedAt: number | null; createdAt: number; contact: string; contactType?: string }[];
  voucherStatus: { status: string; value: number }[];
  loyalty?: {
    totalPointsDistributed: number;
    totalImpactTokens: number;
    totalEuroImpact: number;
    badge500Count: number;
    badge1000Count: number;
    communityRelaunchedCount: number;
    accounts: {
      leadId: string;
      contact: string;
      contactType: string;
      referralCode: string | null;
      huntsCount: number;
      pointsFromHunts: number;
      referralPoints: number;
      totalPoints: number;
      badge500Unlocked: boolean;
      badge1000Unlocked: boolean;
      communityRelaunched: boolean;
      convertedReferrals: number;
      impactTokensEarned: number;
      impactEuroValue: number;
      cashbackCode: string | null;
    }[];
  };
}

const TOKEN_KEY = 'dante-admin:demo-session';
let memoryToken: string | null = null;

/** Il fallback in memoria permette l'accesso anche dentro preview iframe che bloccano sessionStorage. */
function readToken(): string | null {
  if (memoryToken) return memoryToken;
  try { memoryToken = window.sessionStorage.getItem(TOKEN_KEY); } catch { /* storage disabilitato */ }
  return memoryToken;
}
function saveToken(token: string): void {
  memoryToken = token;
  try { window.sessionStorage.setItem(TOKEN_KEY, token); } catch { /* la sessione resta valida in memoria */ }
}
function clearToken(): void {
  memoryToken = null;
  try { window.sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage disabilitato */ }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Servizio amministrativo non disponibile');
  return body;
}

export const adminApi = {
  token: readToken,
  login: async (email: string, password: string) => {
    const data = await parse<{ token: string; user: { name: string; email: string; role: string }; dashboard: DashboardData }>(await fetch('/api/admin/demo-login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
    }));
    saveToken(data.token);
    return { user: data.user, dashboard: data.dashboard };
  },
  logout: clearToken,
  dashboard: async () => {
    const token = readToken();
    if (!token) throw new Error('Accedi con l’account demo');
    return parse<DashboardData>(await fetch('/api/admin/dashboard', { headers: { authorization: `Bearer ${token}` } }));
  },
  verifyVoucher: async (code: string): Promise<VoucherVerificationResult> => {
    const clean = encodeURIComponent(code.trim());
    const res = await fetch(`/api/vouchers/${clean}`);
    const body = await res.json().catch(() => ({})) as VoucherVerificationResult & { error?: string };
    if (!res.ok) {
      return { valid: false, code, kind: 'unknown', tier: 'none', status: 'not_found', error: body.error || 'Codice non trovato' };
    }
    return body;
  },
  redeemVoucher: async (code: string): Promise<VoucherVerificationResult> => {
    const token = readToken();
    const clean = encodeURIComponent(code.trim());
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`/api/vouchers/${clean}/redeem`, { method: 'POST', headers });
    const body = await res.json().catch(() => ({})) as VoucherVerificationResult & { error?: string };
    if (!res.ok) {
      throw new Error(body.error || 'Impossibile convalidare il codice');
    }
    return body;
  },
  relaunchCommunity: async (leadId: string, relaunched: boolean) => {
    const token = readToken();
    if (!token) throw new Error('Accedi con l’account demo');
    return parse<{ success: boolean; leadId: string; relaunched: boolean }>(await fetch('/api/admin/loyalty/relaunch', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ leadId, relaunched }),
    }));
  },
};
