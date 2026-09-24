import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, BadgeCheck, BarChart3, ChevronRight, ContactRound, Copy,
  Gift, LayoutDashboard, LogOut, Mail, RefreshCw, Search, ShieldCheck, Sparkles,
  TicketCheck, TrendingUp, UserPlus, Users, X,
} from 'lucide-react';
import { adminApi, DashboardData } from './adminApi';

const DEMO_EMAIL = 'admin@dantefestival.it';
const DEMO_PASSWORD = 'demo2026';
type Tab = 'overview' | 'contacts' | 'vouchers';

const formatDate = (timestamp: number) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp);
const statusLabel: Record<string, string> = { active: 'Attivo', redeemed: 'Riscattato', expired: 'Scaduto' };
const tierLabel: Record<string, string> = { none: 'Base', silver: 'Argento', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante' };

export const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [authenticated, setAuthenticated] = useState(Boolean(adminApi.token()));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(Boolean(adminApi.token()));
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await adminApi.dashboard()); setAuthenticated(true); }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Errore dashboard';
      setError(message);
      if (message.includes('Sessione amministratore') || !adminApi.token()) {
        adminApi.logout();
        setAuthenticated(false);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { if (authenticated) void load(); }, []);

  if (!authenticated) return <AdminLogin onClose={onClose} onSuccess={dashboard => { setData(dashboard); setLoading(false); setAuthenticated(true); }} />;

  const logout = () => { adminApi.logout(); setAuthenticated(false); setData(null); setError(''); };
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Panoramica', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contatti', icon: <ContactRound className="h-4 w-4" /> },
    { id: 'vouchers', label: 'Voucher', icon: <TicketCheck className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#f4f1ea] text-slate-900 select-text">
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-800/20"><BarChart3 className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-700">Dante Festival</div>
            <h1 className="truncate text-lg font-extrabold tracking-tight">Marketing Control Room</h1>
          </div>
          <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 sm:inline">Dati demo</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50" title="Aggiorna dati"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={logout} className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:flex"><LogOut className="h-3.5 w-3.5" /> Esci</button>
            <button onClick={onClose} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Torna al borgo</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7">
        <nav className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${tab === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>{item.icon}{item.label}</button>)}
        </nav>

        {error && <div className="mb-5 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><span>{error}</span><button onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}
        {loading && !data ? <DashboardSkeleton /> : data && (
          <>
            {tab === 'overview' && <Overview data={data} />}
            {tab === 'contacts' && <Contacts data={data} search={search} setSearch={setSearch} />}
            {tab === 'vouchers' && <Vouchers data={data} search={search} setSearch={setSearch} />}
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
    event.preventDefault(); setBusy(true); setError('');
    try { const session = await adminApi.login(email, password); onSuccess(session.dashboard); }
    catch (err) { setError(err instanceof Error ? err.message : 'Accesso non riuscito'); }
    finally { setBusy(false); }
  };
  const copyCredentials = async () => { await navigator.clipboard?.writeText(`${DEMO_EMAIL}\n${DEMO_PASSWORD}`); };

  return (
    <div className="fixed inset-0 z-[100] grid min-h-full overflow-auto bg-[#07130f] p-4 text-slate-900 select-text sm:place-items-center sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" /><div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-amber-400/15 blur-3xl" /></div>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/15"><ArrowLeft className="h-4 w-4" /> Torna al borgo</button>
      <div className="relative my-auto grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-10 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><BarChart3 className="h-6 w-6" /></div><div><div className="text-[10px] font-bold uppercase tracking-[.24em] text-emerald-200">Dante Festival</div><div className="text-xl font-extrabold">Control Room</div></div></div>
          <div className="mt-auto"><Sparkles className="mb-5 h-8 w-8 text-amber-300" /><h2 className="text-3xl font-black leading-tight">Dai referral ai riscatti, tutto in un solo posto.</h2><p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100/85">Monitora il funnel, confronta i test A/B e individua i migliori ambassador del borgo.</p></div>
          <div className="mt-10 flex gap-6 border-t border-white/15 pt-6 text-xs text-emerald-100"><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Accesso protetto</span><span className="flex items-center gap-1.5"><Activity className="h-4 w-4" /> Dati aggiornati</span></div>
        </section>
        <section className="p-6 sm:p-10">
          <div className="mb-8"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700"><Sparkles className="h-3 w-3" /> Ambiente dimostrativo</span><h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Accesso amministratore</h1><p className="mt-2 text-sm text-slate-500">Usa l’account demo già registrato per esplorare la dashboard.</p></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Email</span><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100"><Mail className="h-4 w-4 text-slate-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" /></div></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Password</span><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 disabled:opacity-60">{busy ? 'Accesso…' : 'Entra nella dashboard'}<ChevronRight className="h-4 w-4" /></button>
          </form>
          <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Credenziali demo</span><button onClick={copyCredentials} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100" title="Copia"><Copy className="h-3.5 w-3.5" /></button></div><div className="mt-2 font-mono text-xs leading-6 text-slate-700"><div>{DEMO_EMAIL}</div><div>{DEMO_PASSWORD}</div></div></div>
        </section>
      </div>
    </div>
  );
};

const Overview: React.FC<{ data: DashboardData }> = ({ data }) => {
  const cards = [
    { label: 'Invitati tracciati', value: data.kpis.invited, note: `da ${data.referrals.length} ambassador attivi`, icon: <Users />, tone: 'emerald' },
    { label: 'Contatti acquisiti', value: data.kpis.leadsFromInvites, note: `${data.kpis.leadConversion}% conversione`, icon: <UserPlus />, tone: 'blue' },
    { label: 'Voucher attivi', value: data.kpis.activeVouchers, note: `${data.kpis.redeemed} già riscattati`, icon: <Gift />, tone: 'amber' },
    { label: 'Tasso di riscatto', value: `${data.kpis.redemptionRate}%`, note: `${data.kpis.marketingOptIns} opt-in marketing`, icon: <TrendingUp />, tone: 'violet' },
  ];
  return <div className="space-y-6">
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Risultati campagna</p><h2 className="mt-1 text-2xl font-black tracking-tight">Il borgo sta convertendo</h2></div><p className="hidden text-xs text-slate-400 sm:block">Aggiornato {formatDate(data.generatedAt)}</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <MetricCard key={card.label} {...card} />)}</div></section>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Andamento ultimi 12 giorni" subtitle="Sessioni e contatti attribuiti"><TrendChart data={data.trend} /></Panel>
      <Panel title="Funnel di conversione" subtitle="Dall’invito al riscatto"><Funnel rows={data.funnel} /></Panel>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Panel title="Leaderboard referral" subtitle="Performance dei due ambassador"><ReferralTable rows={data.referrals} /></Panel>
      <Panel title="Test A/B durata" subtitle="Confronto 20 vs 30 secondi"><AbTest rows={data.abTests} /></Panel>
    </div>
  </div>;
};

const tones: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' };
const MetricCard: React.FC<{ label: string; value: string | number; note: string; icon: React.ReactNode; tone: string }> = ({ label, value, note, icon, tone }) => <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-5 grid h-10 w-10 place-items-center rounded-2xl [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div><div className="text-3xl font-black tracking-tight">{value}</div><div className="mt-1 text-xs font-bold text-slate-700">{label}</div><div className="mt-2 text-[11px] text-slate-400">{note}</div></div>;
const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p></div><div className="p-5">{children}</div></section>;
const TrendChart: React.FC<{ data: DashboardData['trend'] }> = ({ data }) => { const max = Math.max(1, ...data.map(row => row.sessions)); return <div className="flex h-56 items-end gap-2">{data.map(row => <div key={row.day} className="group flex h-full flex-1 flex-col justify-end"><div className="relative flex flex-1 items-end justify-center gap-0.5"><div title={`${row.sessions} sessioni`} className="w-2/3 rounded-t-md bg-emerald-600 transition group-hover:bg-emerald-700" style={{ height: `${Math.max(3, row.sessions / max * 100)}%` }} /><div title={`${row.leads} lead`} className="w-1/3 rounded-t bg-amber-400" style={{ height: `${Math.max(2, row.leads / max * 100)}%` }} /></div><span className="mt-2 hidden -rotate-45 text-[9px] text-slate-400 sm:block">{row.label}</span></div>)}</div>; };
const Funnel: React.FC<{ rows: DashboardData['funnel'] }> = ({ rows }) => { const max = Math.max(1, rows[0]?.value || 1); return <div className="space-y-3">{rows.map((row, index) => <div key={row.label}><div className="mb-1 flex justify-between text-[11px]"><span className="font-semibold text-slate-600">{index + 1}. {row.label}</span><span className="font-extrabold">{row.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400" style={{ width: `${row.value / max * 100}%` }} /></div></div>)}</div>; };
const ReferralTable: React.FC<{ rows: DashboardData['referrals'] }> = ({ rows }) => <div className="space-y-3">{rows.map((row, index) => <div key={row.code} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-xs font-extrabold">{row.contact || 'Profilo anonimo'}</div><div className="font-mono text-[10px] text-emerald-700">{row.code}</div></div><div className="grid grid-cols-3 gap-3 text-center"><SmallStat value={row.invites} label="Inviti" /><SmallStat value={row.leads} label="Lead" /><SmallStat value={`${row.conversion}%`} label="Conv." /></div></div>)}</div>;
const SmallStat: React.FC<{ value: string | number; label: string }> = ({ value, label }) => <div><div className="text-xs font-black">{value}</div><div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div></div>;
const AbTest: React.FC<{ rows: DashboardData['abTests'] }> = ({ rows }) => { const best = Math.max(...rows.map(row => row.conversion)); return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{rows.map(row => { const winner = row.conversion === best; return <div key={row.variant} className={`rounded-2xl border p-4 ${winner ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center justify-between"><span className="text-xs font-extrabold">{row.variant === 'timer_20' ? '20 secondi' : '30 secondi'}</span>{winner && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">Migliore</span>}</div><div className="mt-4 grid grid-cols-3 gap-2"><SmallStat value={row.sessions} label="Sessioni" /><SmallStat value={`${row.conversion}%`} label="Conv." /><SmallStat value={row.averageScore} label="Punti medi" /></div></div>; })}</div>; };

const SearchBar: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-emerald-400"><Search className="h-4 w-4 text-slate-400" /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none" /></div>;
const Contacts: React.FC<{ data: DashboardData; search: string; setSearch: (value: string) => void }> = ({ data, search, setSearch }) => { const rows = useMemo(() => data.recentLeads.filter(row => `${row.contact} ${row.referralCode || ''}`.toLowerCase().includes(search.toLowerCase())), [data, search]); return <div><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Lead management</p><h2 className="mt-1 text-2xl font-black">Contatti acquisiti</h2><p className="mt-1 text-xs text-slate-400">{data.kpis.contacts} contatti totali · {data.kpis.marketingOptIns} consensi marketing</p></div><div className="w-full sm:w-80"><SearchBar value={search} onChange={setSearch} placeholder="Cerca contatto o referral…" /></div></div><div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Contatto</th><th>Referral</th><th>Marketing</th><th>WhatsApp</th><th>Origine</th><th className="pr-5">Registrazione</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-bold">{row.contact}<div className="text-[10px] font-normal text-slate-400">{row.contactType}</div></td><td className="font-mono text-[10px] text-emerald-700">{row.referralCode || '—'}</td><td><Consent value={row.marketingOptIn} /></td><td><Consent value={row.whatsappOptIn} /></td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold">{row.source === 'demo_dashboard' ? 'Demo' : 'Caccia'}</span></td><td className="pr-5 text-slate-500">{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div></div>; };
const Consent: React.FC<{ value: number }> = ({ value }) => value ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Sì</span> : <span className="text-slate-400">No</span>;
const Vouchers: React.FC<{ data: DashboardData; search: string; setSearch: (value: string) => void }> = ({ data, search, setSearch }) => { const rows = useMemo(() => data.recentVouchers.filter(row => `${row.code} ${row.contact} ${row.status}`.toLowerCase().includes(search.toLowerCase())), [data, search]); return <div><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Premi e redemption</p><h2 className="mt-1 text-2xl font-black">Gestione voucher</h2><p className="mt-1 text-xs text-slate-400">{data.kpis.activeVouchers} attivi · {data.kpis.redeemed} riscattati</p></div><div className="w-full sm:w-80"><SearchBar value={search} onChange={setSearch} placeholder="Cerca codice o contatto…" /></div></div><div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[800px] text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Codice</th><th>Contatto</th><th>Premio</th><th>Tier</th><th>Stato</th><th className="pr-5">Emissione</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.code} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-mono font-bold text-emerald-700">{row.code}</td><td className="font-semibold">{row.contact}</td><td className="capitalize">{row.kind}</td><td>{tierLabel[row.tier] || row.tier}</td><td><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.status === 'redeemed' ? 'bg-blue-50 text-blue-700' : row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{statusLabel[row.status] || row.status}</span></td><td className="pr-5 text-slate-500">{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div></div>; };
const DashboardSkeleton = () => <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-white shadow-sm" />)}</div>;
