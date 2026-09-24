import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Gift, LockKeyhole, Mail, MessageCircle, Phone } from 'lucide-react';
import { LeadClaim, trackEvent } from '../game/api';

interface LeadCaptureProps {
  sessionId: string;
  variant: string;
  isPassWinner: boolean;
  onClaim: (lead: LeadClaim) => Promise<void>;
}

/** Gate GDPR-friendly: il server emette il codice soltanto dopo un contatto valido. */
export const LeadCapture: React.FC<LeadCaptureProps> = ({ sessionId, variant, isPassWinner, onClaim }) => {
  const [type, setType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { trackEvent('lead_viewed', { sessionId, variant }); }, [sessionId, variant]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!privacy) { setError('Accetta l’informativa privacy per ricevere il codice.'); return; }
    setBusy(true);
    try { await onClaim({ contactType: type, contact, privacyAccepted: privacy, marketingOptIn: marketing, whatsappOptIn: type === 'phone' && whatsapp }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Non è stato possibile generare il voucher.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-5 mb-5 sm:mx-7">
      <div className="overflow-hidden rounded-3xl border-2 border-[#2f7d5c]/55 bg-gradient-to-br from-[#f2fbf5] via-[#fffdf6] to-[#f7edd6] shadow-xl shadow-[#2b1c06]/15">
        <div className="border-b border-[#2f7d5c]/20 bg-[#2f7d5c] px-4 py-3 text-left text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15"><Gift className="h-5 w-5" /></span>
            <div>
              <div className="fantasy-label text-[9px] font-bold text-[#dcefe2]">Il premio è riservato per te</div>
              <h3 className="fantasy-heading text-base font-bold">Dove inviamo il tuo codice monouso?</h3>
              <p className="text-[10.5px] text-white/80">{isPassWinner ? 'Voucher 10€ + Pass x2' : 'Voucher 10€ per due persone'} · valido 48 ore</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 px-4 py-4 text-left">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#eadcbf]/55 p-1">
            {(['email', 'phone'] as const).map(option => (
              <button key={option} type="button" onClick={() => { setType(option); setContact(''); }} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-extrabold transition ${type === option ? 'bg-[#fffdf6] text-[#2f7d5c] shadow-sm' : 'text-[#6b5940]'}`}>
                {option === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                {option === 'email' ? 'Email' : 'Telefono'}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="fantasy-label mb-1 block text-[9px] font-bold text-[#6b5940]">{type === 'email' ? 'La tua email' : 'Numero con prefisso'}</span>
            <div className="flex items-center gap-2 rounded-2xl border border-[#b8862f]/40 bg-white/80 px-3 py-2.5 focus-within:border-[#2f7d5c] focus-within:ring-2 focus-within:ring-[#2f7d5c]/15">
              {type === 'email' ? <Mail className="h-4 w-4 text-[#8a6a12]" /> : <Phone className="h-4 w-4 text-[#8a6a12]" />}
              <input required autoComplete={type === 'email' ? 'email' : 'tel'} inputMode={type === 'email' ? 'email' : 'tel'} type={type === 'email' ? 'email' : 'tel'} value={contact} onChange={e => setContact(e.target.value)} placeholder={type === 'email' ? 'nome@email.it' : '+39 333 123 4567'} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#3a2c1c] outline-none placeholder:text-[#8b8172]" />
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-[10.5px] leading-snug text-[#4a3a26]">
            <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} className="mt-0.5 accent-[#2f7d5c]" />
            <span>Accetto l’informativa privacy e il trattamento necessario per ricevere e gestire il premio. <strong>Obbligatorio</strong></span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-[10.5px] leading-snug text-[#6b5940]">
            <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} className="mt-0.5 accent-[#2f7d5c]" />
            <span>Voglio ricevere novità, programma e offerte del Dante Festival. Potrò disiscrivermi in ogni momento.</span>
          </label>
          {type === 'phone' && (
            <label className="flex cursor-pointer items-start gap-2 text-[10.5px] leading-snug text-[#6b5940]">
              <input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} className="mt-0.5 accent-[#25D366]" />
              <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#128c47]" />
              <span>Acconsento a ricevere il codice e i reminder anche via WhatsApp.</span>
            </label>
          )}
          {error && <p role="alert" className="rounded-xl bg-[#a9512f]/10 px-3 py-2 text-[11px] font-bold text-[#8d321d]">{error}</p>}
          <button disabled={busy || !contact} className="fantasy-cta flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-55">
            {busy ? 'Genero il codice sicuro…' : 'Sblocca il mio voucher'}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[9.5px] font-semibold text-[#6b5940]"><LockKeyhole className="h-3 w-3 text-[#2f7d5c]" /> Codice emesso dal server, univoco e utilizzabile una sola volta <CheckCircle2 className="h-3 w-3 text-[#2f7d5c]" /></div>
        </form>
      </div>
    </div>
  );
};
