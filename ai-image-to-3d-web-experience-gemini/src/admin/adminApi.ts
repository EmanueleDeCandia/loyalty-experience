export interface DashboardData {
  generatedAt: number;
  kpis: {
    invited: number; contacts: number; leadsFromInvites: number; activeVouchers: number;
    redeemed: number; marketingOptIns: number; leadConversion: number; redemptionRate: number;
  };
  funnel: { label: string; value: number }[];
  referrals: { code: string; contact: string | null; contact_type: string | null; invites: number; leads: number; vouchers: number; redeemed: number; conversion: number }[];
  abTests: { variant: string; sessions: number; completed: number; leads: number; averageScore: number; conversion: number }[];
  trend: { day: string; label: string; sessions: number; leads: number }[];
  recentLeads: { id: string; contact: string; contactType: string; marketingOptIn: number; whatsappOptIn: number; source: string; createdAt: number; referralCode: string | null }[];
  recentVouchers: { code: string; kind: string; tier: string; status: string; expiresAt: number; redeemedAt: number | null; createdAt: number; contact: string }[];
  voucherStatus: { status: string; value: number }[];
}

const TOKEN_KEY = 'dante-admin:demo-session';
async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Servizio amministrativo non disponibile');
  return body;
}

export const adminApi = {
  token: () => sessionStorage.getItem(TOKEN_KEY),
  login: async (email: string, password: string) => {
    const data = await parse<{ token: string; user: { name: string; email: string; role: string } }>(await fetch('/api/admin/demo-login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
    }));
    sessionStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },
  logout: () => sessionStorage.removeItem(TOKEN_KEY),
  dashboard: async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('Accedi con l’account demo');
    return parse<DashboardData>(await fetch('/api/admin/dashboard', { headers: { authorization: `Bearer ${token}` } }));
  },
};
