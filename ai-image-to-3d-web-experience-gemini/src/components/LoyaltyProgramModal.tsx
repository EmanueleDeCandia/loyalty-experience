import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Copy,
  MessageCircle,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { CornerFleuron } from './fantasy/Ornaments';
import { ensureReferralId } from '../game/treasureCatalog';

interface LoyaltyProfileData {
  referralCode: string;
  contact: string | null;
  contactType: string | null;
  totalPoints: number;
  pointsFromHunts: number;
  referralPoints: number;
  huntsCount: number;
  invitedLeadsCount: number;
  convertedReferralsCount: number;
  communityRelaunched: boolean;
  communityBadges: {
    badge500: {
      id: string;
      name: string;
      targetPoints: number;
      unlocked: boolean;
      progress: number;
      percentage: number;
      perk: string;
      statusText: string;
    };
    badge1000: {
      id: string;
      name: string;
      targetPoints: number;
      unlocked: boolean;
      progress: number;
      percentage: number;
      perk: string;
      statusText: string;
    };
  };
  impactTokens: {
    convertedReferrals: number;
    milestoneStep: number;
    tokensEarned: number;
    euroValue: number;
    tokenToEuroRate: number;
    cycleProgress: number;
    nextMilestoneRemaining: number;
    cashbackCode: string | null;
    isUnlocked: boolean;
    rule: string;
  };
}

interface LoyaltyProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralId?: string;
  contact?: string | null;
}

export const LoyaltyProgramModal: React.FC<LoyaltyProgramModalProps> = ({
  isOpen,
  onClose,
  referralId,
  contact,
}) => {
  const activeReferral = referralId || ensureReferralId();
  const [data, setData] = useState<LoyaltyProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (activeReferral) params.set('referralCode', activeReferral);
      if (contact) params.set('contact', contact);

      const res = await fetch(`/api/loyalty/profile?${params.toString()}`);
      if (!res.ok) throw new Error('Impossibile caricare il profilo loyalty');
      const profile = await res.json();
      setData(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchProfile();
    }
  }, [isOpen, activeReferral, contact]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  const shareWhatsApp = () => {
    const inviteLink = typeof window !== 'undefined'
      ? `${window.location.origin}/?caccia=1&ref=${activeReferral}`
      : `https://loyalty-experience.app/?caccia=1&ref=${activeReferral}`;
    const text = encodeURIComponent(
      `Partecipa alla Caccia ai Tesori del Dante Festival! Inquadra i tesori e scopri i premi con il mio invito: ${inviteLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#120a03]/75 backdrop-blur-sm"
      />

      <div className="fantasy-panel relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[#b8862f]/60 bg-gradient-to-b from-[#fbf6ea] via-[#f7edd6] to-[#eddcc0] shadow-2xl text-[#3a2c1c]">
        <CornerFleuron className="pointer-events-none absolute left-2 top-2 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute right-2 top-2 rotate-90 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute bottom-2 right-2 rotate-180 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute bottom-2 left-2 -rotate-90 text-[#b8862f]/70" />

        <div className="absolute right-3.5 top-3.5 z-10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-xl p-1.5 text-[#8a6a12] transition hover:bg-[#b8862f]/20 hover:text-[#3a2c1c]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#b8862f]/40 bg-white/70 px-3 py-1 text-[11px] font-bold text-[#8a6a12] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>Programma Loyalty Marketing</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#2b1c06] font-serif">
              Salvadanaio Fedeltà & Token
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#6b5437]">
              Accumula punti, sblocca la visibilità nella Community e converti i referral in Token di Impatto monetario.
            </p>
          </div>

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-[#b8862f]" />
              <p className="mt-3 text-xs font-semibold text-[#8a6a12]">Caricamento saldo punti...</p>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">
              {error}
              <button onClick={() => void fetchProfile()} className="ml-2 underline">Riprova</button>
            </div>
          ) : data && (
            <div className="mt-6 space-y-6">
              {/* Box Saldo Punti Totale */}
              <div className="relative overflow-hidden rounded-3xl border border-[#b8862f]/50 bg-gradient-to-br from-white/95 via-[#fffbf2] to-[#faedd0] p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#8a6a12]">
                      Codice Personale: <span className="font-mono text-xs text-[#2b1c06] bg-amber-100/70 px-2 py-0.5 rounded-md">{data.referralCode}</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-[#2b1c06] font-mono tracking-tight">
                        {data.totalPoints}
                      </span>
                      <span className="text-sm font-extrabold text-[#b8862f]">Punti Cumulati</span>
                    </div>
                    {data.contact && (
                      <div className="text-[11.5px] text-[#735e45] mt-0.5">
                        Associato a: <strong className="text-[#3a2c1c]">{data.contact}</strong>
                      </div>
                    )}
                  </div>

                  {/* Scomposizione Punti */}
                  <div className="flex sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l border-[#b8862f]/20 pt-3 sm:pt-0 sm:pl-5 text-xs">
                    <div className="flex items-center gap-1.5 text-[#543f25]">
                      <span className="font-bold text-[#2b1c06]">🎯 {data.pointsFromHunts} pt</span>
                      <span>dalle cacce ({data.huntsCount})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#543f25]">
                      <span className="font-bold text-[#2f7d5c]">🤝 {data.referralPoints} pt</span>
                      <span>da inviti ({data.invitedLeadsCount} × 50 pt)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione A: Obiettivi Raggiunti a Punti (500 e 1000 pt - Visibilità Community) */}
              <div className="rounded-2xl border border-[#b8862f]/35 bg-white/80 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/20 text-[#8a6a12]">
                      <Award className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#2b1c06]">
                      Obiettivi Community: Visibilità & Badge
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#8a6a12]">Premi Simbolici</span>
                </div>
                <p className="mt-1.5 text-xs text-[#6b5437]">
                  Raggiungi le soglie di 500 e 1000 punti: il promotore rilancerà il tuo profilo sul sito web della Community del Festival per darti massima visibilità!
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Badge 500 */}
                  <div className={`relative rounded-2xl border p-3.5 transition ${
                    data.communityBadges.badge500.unlocked
                      ? 'border-amber-400 bg-gradient-to-br from-amber-50/90 to-amber-100/60 shadow-sm'
                      : 'border-slate-200 bg-white/60 opacity-90'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${
                          data.communityBadges.badge500.unlocked ? 'bg-amber-400/30' : 'bg-slate-200/50'
                        }`}>
                          🥉
                        </div>
                        <div>
                          <div className="text-xs font-black text-[#2b1c06]">
                            {data.communityBadges.badge500.name}
                          </div>
                          <div className="text-[10px] font-bold text-[#8a6a12]">Traguardo 500 Punti</div>
                        </div>
                      </div>
                      {data.communityBadges.badge500.unlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <Check className="h-3 w-3" /> Sbloccato
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {data.totalPoints} / 500 pt
                        </span>
                      )}
                    </div>

                    {/* Barra Progresso */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                        style={{ width: `${data.communityBadges.badge500.percentage}%` }}
                      />
                    </div>

                    <div className="mt-2.5 text-[11px] leading-relaxed text-[#4a3925]">
                      <strong>Perk:</strong> {data.communityBadges.badge500.perk}.
                    </div>

                    <div className={`mt-2 rounded-xl p-2 text-[10.5px] font-medium ${
                      data.communityBadges.badge500.unlocked
                        ? data.communityRelaunched
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100/80 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {data.communityBadges.badge500.statusText}
                    </div>
                  </div>

                  {/* Badge 1000 */}
                  <div className={`relative rounded-2xl border p-3.5 transition ${
                    data.communityBadges.badge1000.unlocked
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50/90 to-yellow-100/60 shadow-sm'
                      : 'border-slate-200 bg-white/60 opacity-90'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${
                          data.communityBadges.badge1000.unlocked ? 'bg-yellow-400/30' : 'bg-slate-200/50'
                        }`}>
                          🥇
                        </div>
                        <div>
                          <div className="text-xs font-black text-[#2b1c06]">
                            {data.communityBadges.badge1000.name}
                          </div>
                          <div className="text-[10px] font-bold text-[#8a6a12]">Traguardo 1000 Punti</div>
                        </div>
                      </div>
                      {data.communityBadges.badge1000.unlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <Check className="h-3 w-3" /> Sbloccato
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {data.totalPoints} / 1000 pt
                        </span>
                      )}
                    </div>

                    {/* Barra Progresso */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full transition-all duration-500"
                        style={{ width: `${data.communityBadges.badge1000.percentage}%` }}
                      />
                    </div>

                    <div className="mt-2.5 text-[11px] leading-relaxed text-[#4a3925]">
                      <strong>Perk:</strong> {data.communityBadges.badge1000.perk}.
                    </div>

                    <div className={`mt-2 rounded-xl p-2 text-[10.5px] font-medium ${
                      data.communityBadges.badge1000.unlocked
                        ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {data.communityBadges.badge1000.statusText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione B: Punti trasformati in Premi (Token di Impatto = 30€ Cashback) */}
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-[#f2faf5] via-white to-[#e8f7ee] p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-700">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-[#113d28]">
                        Token di Impatto: Cashback nei Borghi
                      </h3>
                      <div className="text-[11px] font-bold text-emerald-700">
                        1 Token = 1 € reale • 3 Referral Convertiti = 30 Token (30 €)
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                    Moneta Borgo
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#214a34]">
                  Ogni volta che <strong>3 amici invitati</strong> completano la caccia e riscattano un prodotto o servizio nell’e-commerce (referral convertiti), guadagni <strong>30 Token di Impatto</strong> (= 30 €) spendibili come Cashback nelle botteghe, ristoranti e cantine dei Borghi del Festival!
                </p>

                {/* Progress Card verso lo scaglione */}
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/90 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1f4a34]">
                    <span>Amici convertiti nel ciclo corrente:</span>
                    <span className="font-mono text-sm text-emerald-700">
                      {data.impactTokens.convertedReferrals} totali ({data.impactTokens.cycleProgress} / 3)
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(step => {
                      const completed = data.impactTokens.cycleProgress >= step || (data.impactTokens.cycleProgress === 0 && data.impactTokens.convertedReferrals >= 3 && data.impactTokens.tokensEarned > 0);
                      return (
                        <div
                          key={step}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                            completed
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-50/60 text-slate-500'
                          }`}
                        >
                          <span className="text-sm font-black">{completed ? '✅' : '👤'}</span>
                          <span className="text-[10px] font-bold mt-0.5">Amico #{step}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-[11px] text-[#426450] text-center">
                    {data.impactTokens.nextMilestoneRemaining === 3
                      ? 'Hai completato il ciclo! Invita altri amici per il prossimo scaglione da 30 Token.'
                      : `Mancano ancora ${data.impactTokens.nextMilestoneRemaining} amici convertiti per sbloccare altri 30 Token.`}
                  </div>
                </div>

                {/* Coupon Cashback Token Assegnati */}
                {data.impactTokens.tokensEarned > 0 ? (
                  <div className="mt-4 rounded-2xl border-2 border-dashed border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      🎉 Token di Impatto Disponibili
                    </div>
                    <div className="mt-1 text-3xl font-black text-emerald-900 font-mono">
                      {data.impactTokens.tokensEarned} TOKEN = {data.impactTokens.euroValue} €
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      Buono Cashback spendibile nelle attività convenzionate del borgo
                    </p>

                    {data.impactTokens.cashbackCode && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="font-mono text-sm font-extrabold tracking-wider bg-white px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 shadow-xs">
                          {data.impactTokens.cashbackCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(data.impactTokens.cashbackCode!)}
                          className="flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 active:scale-95"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? 'Copiato!' : 'Copia'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 p-3 text-center text-xs text-emerald-800">
                    Nessun Token maturato al momento: condividi il tuo codice con gli amici per arrivare a 3 conversioni e sbloccare i tuoi primi 30 Token!
                  </div>
                )}

                {/* Pulsante Invito WhatsApp */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={shareWhatsApp}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#128c47]/25 transition hover:brightness-105 active:scale-98"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Invita amici su WhatsApp per sbloccare i Token</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between rounded-b-[28px] border-t border-[#b8862f]/30 bg-[#f7edd6]/95 px-5 py-3.5 backdrop-blur-md">
          <span className="text-[11px] font-medium text-[#7a644b]">
            Dante Festival • Sistema Loyalty & Impatto Locale
          </span>
          <button
            type="button"
            onClick={onClose}
            className="fantasy-cta fantasy-cta--quiet text-xs font-extrabold px-4 py-2 rounded-xl"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
