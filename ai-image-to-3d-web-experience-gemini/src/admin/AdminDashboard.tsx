import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, BadgeCheck, BarChart3, Check, ChevronRight, ContactRound, Copy,
  Download, Gift, LayoutDashboard, LogOut, Mail, RefreshCw, Search,
  ShieldCheck, Sparkles, TicketCheck, TrendingUp, UserPlus, X, AlertCircle, Coins, Award,
} from 'lucide-react';
import { adminApi, DashboardData, VoucherVerificationResult } from './adminApi';

const DEMO_EMAIL = 'admin@dantefestival.it';
const DEMO_PASSWORD = 'demo2026';
type Tab = 'overview' | 'botteghino' | 'loyalty' | 'vouchers' | 'contacts';

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(timestamp);

const statusLabel: Record<string, string> = { active: 'Attivo', redeemed: 'Riscattato', expired: 'Scaduto' };
const tierLabel: Record<string, string> = { none: 'Base', silver: 'Argento', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante' };

export const AdminDashboard: React.FC<{ onClose: () => void; initialTab?: Tab }> = ({ onClose, initialTab = 'overview' }) => {
  const [authenticated, setAuthenticated] = useState(Boolean(adminApi.token()));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(Boolean(adminApi.token()));
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminApi.dashboard());
      setAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore dashboard';
      setError(message);
      if (message.includes('Sessione amministratore') || !adminApi.token()) {
        adminApi.logout();
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) void load();
  }, []);

  if (!authenticated) {
    return (
      <AdminLogin
        onClose={onClose}
        onSuccess={dashboard => {
          setData(dashboard);
          setLoading(false);
          setAuthenticated(true);
        }}
      />
    );
  }

  const logout = () => {
    adminApi.logout();
    setAuthenticated(false);
    setData(null);
    setError('');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Panoramica', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'botteghino', label: 'Botteghino (Check-in Rapido)', icon: <TicketCheck className="h-4 w-4" />, badge: 'Priorità' },
    { id: 'loyalty', label: 'Loyalty & Token di Impatto', icon: <Sparkles className="h-4 w-4" />, badge: 'Nuovo' },
    { id: 'vouchers', label: 'Gestione Voucher', icon: <Gift className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contatti Acquisiti', icon: <ContactRound className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#f4f1ea] text-slate-900 select-text">
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-800/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-700">Dante Festival</div>
            <h1 className="truncate text-lg font-extrabold tracking-tight">Marketing Control Room & Botteghino</h1>
          </div>
          <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 sm:inline">
            Dati demo & Live
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              title="Aggiorna dati"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:flex"
            >
              <LogOut className="h-3.5 w-3.5" /> Esci
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Torna al borgo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7">
        <nav className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === item.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${
                  tab === item.id ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <span>{error}</span>
            <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
          </div>
        )}

        {loading && !data ? (
          <DashboardSkeleton />
        ) : data && (
          <>
            {tab === 'overview' && <Overview data={data} onNavigateToBotteghino={() => setTab('botteghino')} />}
            {tab === 'botteghino' && <Botteghino data={data} onRefresh={load} />}
            {tab === 'loyalty' && <LoyaltySection data={data} onRefresh={load} />}
            {tab === 'contacts' && <Contacts data={data} search={search} setSearch={setSearch} />}
            {tab === 'vouchers' && <Vouchers data={data} search={search} setSearch={setSearch} onRefresh={load} />}
          </>
        )}
      </main>
    </div>
  );
};

const AdminLogin: React.FC<{ onClose: () => void; onSuccess: (dashboard: DashboardData) => void }> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await adminApi.login(email, password);
      onSuccess(session.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso non riuscito');
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    await navigator.clipboard?.writeText(`${DEMO_EMAIL}\n${DEMO_PASSWORD}`);
  };

  return (
    <div className="fixed inset-0 z-[100] grid min-h-full overflow-auto bg-[#07130f] p-4 text-slate-900 select-text sm:place-items-center sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-amber-400/15 blur-3xl" />
      </div>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/15">
        <ArrowLeft className="h-4 w-4" /> Torna al borgo
      </button>
      <div className="relative my-auto grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-10 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><BarChart3 className="h-6 w-6" /></div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.24em] text-emerald-200">Dante Festival</div>
              <div className="text-xl font-extrabold">Control Room & Botteghino</div>
            </div>
          </div>
          <div className="mt-auto">
            <Sparkles className="mb-5 h-8 w-8 text-amber-300" />
            <h2 className="text-3xl font-black leading-tight">Dai pass omaggio al botteghino fino ai voucher e-commerce.</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100/85">
              Valida gli ingressi del festival, monitora i lead acquisiti e controlla l'inventario giornaliero dei biglietti.
            </p>
          </div>
          <div className="mt-10 flex gap-6 border-t border-white/15 pt-6 text-xs text-emerald-100">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Check-in Botteghino</span>
            <span className="flex items-center gap-1.5"><Activity className="h-4 w-4" /> Dati in tempo reale</span>
          </div>
        </section>
        <section className="p-6 sm:p-10">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              <Sparkles className="h-3 w-3" /> Ambiente dimostrativo
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Accesso operatore</h1>
            <p className="mt-2 text-sm text-slate-500">Usa l’account demo per accedere alla dashboard o al modulo botteghino.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Email</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Mail className="h-4 w-4 text-slate-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Password</span>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 disabled:opacity-60">
              {busy ? 'Accesso in corso…' : 'Accedi alla console'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Credenziali demo predefinite</span>
              <button onClick={copyCredentials} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100" title="Copia">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 font-mono text-xs leading-6 text-slate-700">
              <div>{DEMO_EMAIL}</div>
              <div>{DEMO_PASSWORD}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const Overview: React.FC<{ data: DashboardData; onNavigateToBotteghino: () => void }> = ({ data, onNavigateToBotteghino }) => {
  const cards = [
    { label: 'Pass Spettacolo Oggi', value: `${data.inventory?.remaining ?? 20} / ${data.inventory?.dailyCap ?? 20}`, note: `${data.kpis.passesIssued ?? 0} emessi in totale`, icon: <TicketCheck />, tone: 'emerald' },
    { label: 'Contatti Acquisiti', value: data.kpis.contacts, note: `${data.kpis.marketingOptIns} opt-in marketing`, icon: <UserPlus />, tone: 'blue' },
    { label: 'Pass & Voucher Attivi', value: data.kpis.activeVouchers, note: `${data.kpis.redeemed} già convalidati`, icon: <Gift />, tone: 'amber' },
    { label: 'Tasso di Riscatto', value: `${data.kpis.redemptionRate}%`, note: `${data.kpis.leadConversion}% conversione lead`, icon: <TrendingUp />, tone: 'violet' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner rapido botteghino */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-900 to-teal-800 p-6 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <TicketCheck className="h-4 w-4" /> Check-in Spettacoli
          </div>
          <h2 className="mt-1 text-xl font-black">Postazione Botteghino All’Ingresso</h2>
          <p className="mt-1 text-xs text-emerald-100/90">
            Un visitatore ha presentato un pass spettacoli? Verifica il codice e convalida subito i 2 biglietti omaggio.
          </p>
        </div>
        <button
          onClick={onNavigateToBotteghino}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-slate-900 shadow-md transition hover:bg-emerald-50"
        >
          <Search className="h-4 w-4 text-emerald-700" />
          Apri Controllo Pass
        </button>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Risultati campagna</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Panoramica Attività</h2>
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">Aggiornato {formatDate(data.generatedAt)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => <MetricCard key={card.label} {...card} />)}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Andamento ultimi 12 giorni" subtitle="Sessioni e contatti attribuiti"><TrendChart data={data.trend} /></Panel>
        <Panel title="Funnel di conversione" subtitle="Dall’invito al riscatto"><Funnel rows={data.funnel} /></Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Leaderboard referral" subtitle="Performance ambassador"><ReferralTable rows={data.referrals} /></Panel>
        <Panel title="Test A/B durata" subtitle="Confronto 20 vs 30 secondi"><AbTest rows={data.abTests} /></Panel>
      </div>
    </div>
  );
};

const Botteghino: React.FC<{ data: DashboardData; onRefresh: () => void }> = ({ data, onRefresh }) => {
  const [codeQuery, setCodeQuery] = useState('');
  const [result, setResult] = useState<VoucherVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'redeemed'>('all');

  const checkCode = async (targetCode?: string) => {
    const raw = (targetCode ?? codeQuery).trim();
    if (!raw) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await adminApi.verifyVoucher(raw);
      setResult(res);
      if (!res.valid) {
        if (res.status === 'redeemed') {
          setFeedback({
            type: 'error',
            message: `⚠️ Codice già utilizzato in precedenza il ${res.redeemedAt ? formatDate(res.redeemedAt) : 'passato'} da ${res.contact || 'utente'}!`,
          });
        } else if (res.status === 'expired') {
          setFeedback({
            type: 'error',
            message: `⚠️ Questo codice è scaduto il ${res.expiresAt ? formatDate(res.expiresAt) : ''}.`,
          });
        } else {
          setFeedback({
            type: 'error',
            message: '❌ Nessun pass o voucher trovato con questo codice: verifica che sia stato digitato correttamente.',
          });
        }
      } else {
        setFeedback({
          type: 'success',
          message: `✅ Pass autentico e valido! Pronto per l'ingresso di 2 persone.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Errore durante la verifica' });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (codeToRedeem: string) => {
    setRedeeming(true);
    try {
      const res = await adminApi.redeemVoucher(codeToRedeem);
      setResult(res);
      setFeedback({
        type: 'success',
        message: `🎉 INGRESSO CONVALIDATO! 2 persone registrate per ${res.contact || 'il titolare'}.`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Impossibile convalidare l’ingresso' });
    } finally {
      setRedeeming(false);
    }
  };

  const showPasses = useMemo(() => {
    const list = data.recentVouchers.filter(v => v.kind === 'pass' || v.kind === 'pass_vip');
    if (filter === 'active') return list.filter(v => v.status === 'active');
    if (filter === 'redeemed') return list.filter(v => v.status === 'redeemed');
    return list;
  }, [data.recentVouchers, filter]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Check-in in presenza</p>
        <h2 className="mt-1 text-2xl font-black">Controllo & Validazione Pass al Botteghino</h2>
        <p className="mt-1 text-xs text-slate-500">
          Inserisci o incolla il codice presentato dal visitatore (es. <code className="rounded bg-slate-200 px-1 py-0.5 font-mono">DANTE-PASS2-ZSXTM2X</code> oppure le sole ultime lettere <code className="rounded bg-slate-200 px-1 py-0.5 font-mono">ZSXTM2X</code>).
        </p>
      </div>

      {/* Terminale rapido di verifica */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          onSubmit={e => {
            e.preventDefault();
            void checkCode();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={codeQuery}
              onChange={e => setCodeQuery(e.target.value.toUpperCase())}
              placeholder="Inserisci codice pass (es. DANTE-PASS2-ZSXTM2X o ZSXTM2X)…"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 font-mono text-sm font-bold tracking-wide outline-none transition focus:border-emerald-600 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !codeQuery.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 disabled:opacity-50"
          >
            <TicketCheck className="h-4 w-4" />
            {loading ? 'Verifica in corso…' : 'Verifica Pass'}
          </button>
        </form>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
              feedback.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : feedback.type === 'info'
                ? 'border border-blue-200 bg-blue-50 text-blue-900'
                : 'border border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scheda esito pass */}
        {result && (
          <div className="mt-5 overflow-hidden rounded-2xl border-2 border-dashed border-emerald-500/70 bg-gradient-to-br from-emerald-50/70 to-slate-50 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${
                      result.status === 'active' && result.valid
                        ? 'bg-emerald-600 text-white'
                        : result.status === 'redeemed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {result.status === 'active' && result.valid
                      ? 'Pass Valido'
                      : result.status === 'redeemed'
                      ? 'Già Riscattato'
                      : 'Non Valido / Scaduto'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Tier: {tierLabel[result.tier] || result.tier}
                  </span>
                </div>
                <h3 className="mt-2 font-mono text-2xl font-black text-slate-900">{result.code}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {result.entitlement || (result.isPass ? 'Ingresso per 2 persone agli spettacoli' : 'Voucher 10€')}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Intestatario:</span>{' '}
                    <strong className="text-slate-900">{result.contact || 'Non specificato'}</strong>
                  </div>
                  {result.createdAt && (
                    <div>
                      <span className="text-slate-400">Emesso:</span>{' '}
                      <strong>{formatDate(result.createdAt)}</strong>
                    </div>
                  )}
                  {result.redeemedAt && (
                    <div>
                      <span className="text-slate-400">Data riscatto:</span>{' '}
                      <strong className="text-blue-700">{formatDate(result.redeemedAt)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Azione di convalida botteghino */}
              <div className="flex shrink-0 flex-col gap-2">
                {result.valid && result.status === 'active' ? (
                  <button
                    onClick={() => void handleRedeem(result.code)}
                    disabled={redeeming}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-800/30 transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" />
                    {redeeming ? 'Convalida in corso…' : 'CONVALIDA 2 INGRESSI'}
                  </button>
                ) : result.status === 'redeemed' ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-xs font-bold text-blue-800">
                    Ingresso già convalidato
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Elenco veloce dei Pass Spettacolo emessi */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900">Pass Spettacolo Registrati nel Sistema</h3>
            <p className="text-xs text-slate-500">Elenco completo dei pass generati dai vincitori Platino e Diamante</p>
          </div>
          <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Tutti ({data.recentVouchers.filter(v => v.kind === 'pass' || v.kind === 'pass_vip').length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === 'active' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
            >
              Attivi ({data.recentVouchers.filter(v => (v.kind === 'pass' || v.kind === 'pass_vip') && v.status === 'active').length})
            </button>
            <button
              onClick={() => setFilter('redeemed')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === 'redeemed' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500'}`}
            >
              Riscattati ({data.recentVouchers.filter(v => (v.kind === 'pass' || v.kind === 'pass_vip') && v.status === 'redeemed').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Codice Pass</th>
                <th>Intestatario / Contatto</th>
                <th>Tipo Spettacolo</th>
                <th>Tier</th>
                <th>Stato</th>
                <th>Emissione</th>
                <th className="pr-4 text-right">Azione Botteghino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showPasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Nessun pass spettacolo in questa categoria.
                  </td>
                </tr>
              ) : (
                showPasses.map(row => (
                  <tr key={row.code} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-800">
                      {row.code}
                    </td>
                    <td className="font-semibold text-slate-800">{row.contact}</td>
                    <td>{row.kind === 'pass_vip' ? 'VIP + Backstage (2 pers.)' : 'Standard (2 pers.)'}</td>
                    <td>{tierLabel[row.tier] || row.tier}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.status === 'redeemed'
                            ? 'bg-blue-50 text-blue-700'
                            : row.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {statusLabel[row.status] || row.status}
                      </span>
                    </td>
                    <td className="text-slate-500">{formatDate(row.createdAt)}</td>
                    <td className="pr-4 text-right">
                      {row.status === 'active' ? (
                        <button
                          onClick={() => {
                            setCodeQuery(row.code);
                            void checkCode(row.code);
                          }}
                          className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          Controlla / Convalida
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {row.redeemedAt ? `Convalidato ${formatDate(row.redeemedAt)}` : 'Concluso'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const tones: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
};

const MetricCard: React.FC<{ label: string; value: string | number; note: string; icon: React.ReactNode; tone: string }> = ({ label, value, note, icon, tone }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`mb-5 grid h-10 w-10 place-items-center rounded-2xl [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div>
    <div className="text-3xl font-black tracking-tight">{value}</div>
    <div className="mt-1 text-xs font-bold text-slate-700">{label}</div>
    <div className="mt-2 text-[11px] text-slate-400">{note}</div>
  </div>
);

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4">
      <h3 className="text-sm font-extrabold">{title}</h3>
      <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const TrendChart: React.FC<{ data: DashboardData['trend'] }> = ({ data }) => {
  const max = Math.max(1, ...data.map(row => row.sessions));
  return (
    <div className="flex h-56 items-end gap-2">
      {data.map(row => (
        <div key={row.day} className="group flex h-full flex-1 flex-col justify-end">
          <div className="relative flex flex-1 items-end justify-center gap-0.5">
            <div title={`${row.sessions} sessioni`} className="w-2/3 rounded-t-md bg-emerald-600 transition group-hover:bg-emerald-700" style={{ height: `${Math.max(3, row.sessions / max * 100)}%` }} />
            <div title={`${row.leads} lead`} className="w-1/3 rounded-t bg-amber-400" style={{ height: `${Math.max(2, row.leads / max * 100)}%` }} />
          </div>
          <span className="mt-2 hidden -rotate-45 text-[9px] text-slate-400 sm:block">{row.label}</span>
        </div>
      ))}
    </div>
  );
};

const Funnel: React.FC<{ rows: DashboardData['funnel'] }> = ({ rows }) => {
  const max = Math.max(1, rows[0]?.value || 1);
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="font-semibold text-slate-600">{index + 1}. {row.label}</span>
            <span className="font-extrabold">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400" style={{ width: `${row.value / max * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ReferralTable: React.FC<{ rows: DashboardData['referrals'] }> = ({ rows }) => (
  <div className="space-y-3">
    {rows.map((row, index) => (
      <div key={row.code} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-extrabold">{row.contact || 'Profilo anonimo'}</div>
          <div className="font-mono text-[10px] text-emerald-700">{row.code}</div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <SmallStat value={row.invites} label="Inviti" />
          <SmallStat value={row.leads} label="Lead" />
          <SmallStat value={`${row.conversion}%`} label="Conv." />
        </div>
      </div>
    ))}
  </div>
);

const SmallStat: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
  <div>
    <div className="text-xs font-black">{value}</div>
    <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
  </div>
);

const AbTest: React.FC<{ rows: DashboardData['abTests'] }> = ({ rows }) => {
  const best = Math.max(...rows.map(row => row.conversion));
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {rows.map(row => {
        const winner = row.conversion === best;
        return (
          <div key={row.variant} className={`rounded-2xl border p-4 ${winner ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">{row.variant === 'timer_20' ? '20 secondi' : '30 secondi'}</span>
              {winner && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">Migliore</span>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SmallStat value={row.sessions} label="Sessioni" />
              <SmallStat value={`${row.conversion}%`} label="Conv." />
              <SmallStat value={row.averageScore} label="Punti medi" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SearchBar: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-emerald-400">
    <Search className="h-4 w-4 text-slate-400" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none" />
  </div>
);

const Contacts: React.FC<{ data: DashboardData; search: string; setSearch: (value: string) => void }> = ({ data, search, setSearch }) => {
  const rows = useMemo(
    () =>
      data.recentLeads.filter(row =>
        `${row.contact} ${row.personalReferralCode || ''} ${row.referredByCode || ''} ${row.referredByContact || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [data, search]
  );

  const exportContactsCsv = () => {
    const headers = [
      'ID',
      'Contatto',
      'Tipo',
      'Codice Invito Personale',
      'Invitato Da Codice',
      'Invitato Da Contatto',
      'Marketing Opt-In',
      'WhatsApp Opt-In',
      'Origine',
      'Data Registrazione',
    ];
    const csvRows = data.recentLeads.map(l => [
      l.id,
      l.contact,
      l.contactType,
      l.personalReferralCode || '',
      l.referredByCode || '',
      l.referredByContact || '',
      l.marketingOptIn ? 'SI' : 'NO',
      l.whatsappOptIn ? 'SI' : 'NO',
      l.source,
      formatDate(l.createdAt),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(e => e.map(s => `"${s}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dante_festival_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Lead management</p>
          <h2 className="mt-1 text-2xl font-black">Contatti Acquisiti & Tracciamento Inviti</h2>
          <p className="mt-1 text-xs text-slate-400">
            {data.kpis.contacts} contatti totali · {data.kpis.marketingOptIns} consensi marketing
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-80">
            <SearchBar value={search} onChange={setSearch} placeholder="Cerca contatto o codice invito…" />
          </div>
          <button
            onClick={exportContactsCsv}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Esporta CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3">Contatto Acquisito</th>
              <th>Codice Personale (Ambassador)</th>
              <th>Invitato Da (Referrer)</th>
              <th>Marketing</th>
              <th>WhatsApp</th>
              <th>Origine</th>
              <th className="pr-5">Registrazione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-bold text-slate-900">
                  {row.contact}
                  <div className="text-[10px] font-normal text-slate-400">{row.contactType}</div>
                </td>
                <td>
                  {row.personalReferralCode ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {row.personalReferralCode}
                      </span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        Suo codice
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td>
                  {row.referredByCode ? (
                    <div>
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                        {row.referredByCode}
                      </span>
                      {row.referredByContact && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          da <strong className="text-slate-700">{row.referredByContact}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      Diretto / Organico
                    </span>
                  )}
                </td>
                <td><Consent value={row.marketingOptIn} /></td>
                <td><Consent value={row.whatsappOptIn} /></td>
                <td>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold">
                    {row.source === 'demo_dashboard' ? 'Demo' : 'Caccia'}
                  </span>
                </td>
                <td className="pr-5 text-slate-500">{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Consent: React.FC<{ value: number }> = ({ value }) =>
  value ? (
    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
      <BadgeCheck className="h-3.5 w-3.5" /> Sì
    </span>
  ) : (
    <span className="text-slate-400">No</span>
  );

const Vouchers: React.FC<{
  data: DashboardData;
  search: string;
  setSearch: (value: string) => void;
  onRefresh: () => void;
}> = ({ data, search, setSearch, onRefresh }) => {
  const [kindFilter, setKindFilter] = useState<'all' | 'pass' | 'aperitivo'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed'>('all');

  const rows = useMemo(() => {
    return data.recentVouchers.filter(row => {
      const matchSearch = `${row.code} ${row.contact} ${row.status}`.toLowerCase().includes(search.toLowerCase());
      const matchKind =
        kindFilter === 'all'
          ? true
          : kindFilter === 'pass'
          ? row.kind === 'pass' || row.kind === 'pass_vip'
          : row.kind === 'aperitivo';
      const matchStatus = statusFilter === 'all' ? true : row.status === statusFilter;
      return matchSearch && matchKind && matchStatus;
    });
  }, [data.recentVouchers, search, kindFilter, statusFilter]);

  const exportVouchersCsv = () => {
    const headers = ['Codice', 'Tipo', 'Tier', 'Contatto', 'Stato', 'Emissione', 'Riscatto'];
    const csvRows = data.recentVouchers.map(v => [
      v.code,
      v.kind,
      v.tier,
      v.contact,
      v.status,
      formatDate(v.createdAt),
      v.redeemedAt ? formatDate(v.redeemedAt) : 'Non riscattato',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(e => e.map(s => `"${s}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dante_festival_vouchers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickRedeem = async (code: string) => {
    if (!window.confirm(`Confermi la convalida al botteghino del codice ${code}?`)) return;
    try {
      await adminApi.redeemVoucher(code);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Errore');
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Premi e redemption</p>
          <h2 className="mt-1 text-2xl font-black">Gestione Voucher & Pass Spettacoli</h2>
          <p className="mt-1 text-xs text-slate-400">
            {data.kpis.activeVouchers} attivi · {data.kpis.redeemed} riscattati
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <SearchBar value={search} onChange={setSearch} placeholder="Cerca codice o contatto…" />
          </div>
          <button
            onClick={exportVouchersCsv}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Esporta CSV
          </button>
        </div>
      </div>

      {/* Filtri per categoria */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setKindFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${kindFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Tutti i premi
          </button>
          <button
            onClick={() => setKindFilter('pass')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${kindFilter === 'pass' ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}
          >
            🎟️ Pass Spettacoli (Botteghino)
          </button>
          <button
            onClick={() => setKindFilter('aperitivo')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${kindFilter === 'aperitivo' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
          >
            🍷 Voucher Aperitivo
          </button>
        </div>

        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Tutti gli stati
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${statusFilter === 'active' ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}
          >
            Attivi
          </button>
          <button
            onClick={() => setStatusFilter('redeemed')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${statusFilter === 'redeemed' ? 'bg-blue-700 text-white' : 'text-slate-600'}`}
          >
            Riscattati
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[840px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3">Codice</th>
              <th>Contatto</th>
              <th>Categoria Premio</th>
              <th>Tier</th>
              <th>Stato</th>
              <th>Emissione</th>
              <th className="pr-5 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.code} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-mono font-bold text-emerald-700">{row.code}</td>
                <td className="font-semibold">{row.contact}</td>
                <td className="font-semibold capitalize">
                  {row.kind === 'pass'
                    ? 'Pass Spettacolo x2'
                    : row.kind === 'pass_vip'
                    ? 'Pass VIP x2 + Backstage'
                    : 'Voucher Aperitivo (10€)'}
                </td>
                <td>{tierLabel[row.tier] || row.tier}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      row.status === 'redeemed'
                        ? 'bg-blue-50 text-blue-700'
                        : row.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {statusLabel[row.status] || row.status}
                  </span>
                </td>
                <td className="text-slate-500">{formatDate(row.createdAt)}</td>
                <td className="pr-5 text-right">
                  {row.status === 'active' ? (
                    <button
                      onClick={() => void handleQuickRedeem(row.code)}
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Convalida
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {row.redeemedAt ? `Riscattato ${formatDate(row.redeemedAt)}` : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LoyaltySection: React.FC<{ data: DashboardData; onRefresh: () => void }> = ({ data, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterBadge, setFilterBadge] = useState<'all' | '500' | '1000' | 'tokens'>('all');
  const [relaunchingId, setRelaunchingId] = useState<string | null>(null);

  const loyalty = data.loyalty;
  const accounts = useMemo(() => {
    if (!loyalty?.accounts) return [];
    return loyalty.accounts.filter(acc => {
      const matchSearch =
        acc.contact.toLowerCase().includes(search.toLowerCase()) ||
        (acc.referralCode && acc.referralCode.toLowerCase().includes(search.toLowerCase()));
      if (!matchSearch) return false;
      if (filterBadge === '500') return acc.badge500Unlocked;
      if (filterBadge === '1000') return acc.badge1000Unlocked;
      if (filterBadge === 'tokens') return acc.impactTokensEarned > 0;
      return true;
    });
  }, [loyalty, search, filterBadge]);

  const handleToggleRelaunch = async (leadId: string, currentStatus: boolean) => {
    setRelaunchingId(leadId);
    try {
      await adminApi.relaunchCommunity(leadId, !currentStatus);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore durante l’aggiornamento');
    } finally {
      setRelaunchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Punti Totali Distribuiti</span>
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 font-mono">
            {loyalty?.totalPointsDistributed?.toLocaleString() ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Punti da cacce + bonus inviti (50 pt per amico registrato)
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Token di Impatto Generati</span>
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-950 font-mono">
            {loyalty?.totalImpactTokens ?? 0} <span className="text-base font-bold text-emerald-700">Token</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-700">
            = {loyalty?.totalEuroImpact ?? 0} € di Cashback immessi nei Borghi
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Traguardi Community</span>
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-yellow-50 text-yellow-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">{loyalty?.badge500Count ?? 0}</span>
              <span className="text-[11px] font-bold text-slate-500 ml-1">Ambassador (500 pt)</span>
            </div>
            <div>
              <span className="text-2xl font-black text-amber-600 font-mono">{loyalty?.badge1000Count ?? 0}</span>
              <span className="text-[11px] font-bold text-slate-500 ml-1">Leggende (1000 pt)</span>
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Profili idonei al rilancio visibilità nella Community
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rilanciati su Community</span>
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 font-mono">
            {loyalty?.communityRelaunchedCount ?? 0} <span className="text-base font-normal text-slate-400">/ {loyalty?.badge500Count ?? 0}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Account promossi sul sito e canali ufficiali
          </div>
        </div>
      </div>

      {/* Regolamento Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>Regole di Loyalty Marketing Attive</span>
        </h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-600">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
              <span>🥉 a) Obiettivi Community & Visibilità (500 e 1000 pt)</span>
            </div>
            <p className="mt-1 text-amber-800">
              Al raggiungimento di <strong>500 punti</strong> (Community Ambassador) e <strong>1000 punti</strong> (Custode Onorario), il promotore rilancia il profilo dell'account nel sito web ufficiale della Community con speciali Badge dedicati, riconoscendo il contributo dell'utente.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
              <span>🪙 b) Token di Impatto (3 Referral Convertiti = 30 Token = 30 €)</span>
            </div>
            <p className="mt-1 text-emerald-800">
              Ogni <strong>3 referral convertiti</strong> (amici invitati che hanno riscattato un prodotto o servizio nell'e-commerce), l'ambassador riceve <strong>30 Token di Impatto</strong> (valore reale di <strong>30 €</strong>, tasso 1 Token = 1 €) spendibili come Cashback nelle attività e botteghe del borgo.
            </p>
          </div>
        </div>
      </div>

      {/* Tabella Utenti & Gestione Rilancio */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Leaderboard & Gestione Account Loyalty</h3>
            <p className="text-xs text-slate-500">Monitora i punti cumulati, valida i rilanci Community ed eroga i Token di Impatto.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <SearchBar value={search} onChange={setSearch} placeholder="Cerca contatto o referral…" />
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
              <button
                onClick={() => setFilterBadge('all')}
                className={`rounded-lg px-2.5 py-1 font-bold ${filterBadge === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilterBadge('500')}
                className={`rounded-lg px-2.5 py-1 font-bold ${filterBadge === '500' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500'}`}
              >
                ≥500 pt
              </button>
              <button
                onClick={() => setFilterBadge('1000')}
                className={`rounded-lg px-2.5 py-1 font-bold ${filterBadge === '1000' ? 'bg-white text-yellow-700 shadow-xs' : 'text-slate-500'}`}
              >
                ≥1000 pt
              </button>
              <button
                onClick={() => setFilterBadge('tokens')}
                className={`rounded-lg px-2.5 py-1 font-bold ${filterBadge === 'tokens' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
              >
                Con Token
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">Contatto Utente</th>
                <th>Codice Referral</th>
                <th>Punti Cumulati</th>
                <th>Badge Community</th>
                <th>Rilancio Community</th>
                <th>Ref. Convertiti</th>
                <th>Token di Impatto (30€ / 3 conv.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map(acc => (
                <tr key={acc.leadId} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    <div>{acc.contact}</div>
                    <div className="text-[10px] font-normal text-slate-400">{acc.huntsCount} cacce giocate</div>
                  </td>
                  <td className="font-mono font-bold text-slate-700">
                    {acc.referralCode ?? '—'}
                  </td>
                  <td>
                    <div className="font-mono text-sm font-black text-slate-900">
                      {acc.totalPoints} <span className="text-xs font-normal text-slate-400">pt</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {acc.pointsFromHunts} cacce + {acc.referralPoints} referral
                    </div>
                  </td>
                  <td>
                    {acc.badge1000Unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10.5px] font-extrabold text-yellow-900">
                        🥇 Custode Onorario (1000 pt)
                      </span>
                    ) : acc.badge500Unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-900">
                        🥉 Ambassador (500 pt)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">In progresso ({acc.totalPoints}/500)</span>
                    )}
                  </td>
                  <td>
                    {acc.badge500Unlocked ? (
                      <button
                        onClick={() => void handleToggleRelaunch(acc.leadId, acc.communityRelaunched)}
                        disabled={relaunchingId === acc.leadId}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                          acc.communityRelaunched
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        {acc.communityRelaunched ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Rilanciato su Community</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-amber-600" />
                            <span>Da Rilanciare</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Soglia non raggiunta</span>
                    )}
                  </td>
                  <td>
                    <div className="font-mono text-xs font-bold text-slate-800">
                      {acc.convertedReferrals} convertiti
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {acc.convertedReferrals % 3} / 3 nel ciclo
                    </div>
                  </td>
                  <td>
                    {acc.impactTokensEarned > 0 ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800 font-mono">
                          🪙 {acc.impactTokensEarned} Token ({acc.impactEuroValue} €)
                        </span>
                        {acc.cashbackCode && (
                          <div className="font-mono text-[10px] font-bold text-emerald-700">
                            {acc.cashbackCode}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {3 - (acc.convertedReferrals % 3)} conversioni per 30 Token
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Nessun account loyalty trovato con i filtri correnti.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 8 }, (_, i) => (
      <div key={i} className="h-40 animate-pulse rounded-3xl bg-white shadow-sm" />
    ))}
  </div>
);
