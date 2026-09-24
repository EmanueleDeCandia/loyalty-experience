import React from 'react';
import {
  Coins,
  Compass,
  Crown,
  Flame,
  Hourglass,
  MapPin,
  Play,
  QrCode,
  Scroll,
  ShoppingBag,
  Sparkles,
  Sun,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { HUNT_DURATION_MS, NO_TIER, TIERS, VOUCHER_VALIDITY_HOURS } from '../game/treasureCatalog';
import { HuntItem, StoredProgress } from '../game/useTreasureHunt';
import { MedalBadge } from './MedalBadge';
import { CornerFleuron, FlourishDivider, VillageCrest, WaxSeal } from './fantasy/Ornaments';

interface TreasureStartModalProps {
  isOpen: boolean;
  items: HuntItem[];
  record: StoredProgress;
  onStart: () => void;
  onClose: () => void;
}

/** Rango dell'esploratore in base al miglior punteggio. */
function explorerRank(bestScore: number): { title: string; note: string } {
  if (bestScore >= 50) return { title: 'Maestro dei Tesori', note: 'Diamante conquistato' };
  if (bestScore >= 40) return { title: 'Custode del Borgo', note: 'Platino conquistato' };
  if (bestScore >= 30) return { title: 'Esploratore Esperto', note: 'Oro conquistato' };
  if (bestScore >= 20) return { title: 'Cercatore', note: 'Argento conquistato' };
  return { title: 'Novizio del Cielo', note: 'La caccia ti attende' };
}

/**
 * "Scheda dell'Esploratore": pergamena con regole, figurine da trovare,
 * scala dei premi e progressi personali.
 */
export const TreasureStartModal: React.FC<TreasureStartModalProps> = ({
  isOpen,
  items,
  record,
  onStart,
  onClose,
}) => {
  if (!isOpen) return null;

  const foundNow = items.filter(item => item.revealed).length;
  const rank = explorerRank(record.bestScore);
  const ladder = [NO_TIER, ...TIERS.slice(1)];
  const totalVouchers = record.vouchers.length;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Chiudi la scheda"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#1b1206]/65 backdrop-blur-sm"
      />

      <div className="fantasy-panel relative max-h-[93vh] w-full max-w-2xl overflow-y-auto rounded-[26px] animate-in fade-in zoom-in-95 duration-200">
        {/* Cornici d'angolo */}
        <CornerFleuron className="pointer-events-none absolute left-1.5 top-1.5 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute right-1.5 top-1.5 rotate-90 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute bottom-1.5 right-1.5 rotate-180 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute bottom-1.5 left-1.5 -rotate-90 text-[#b8862f]/70" />

        {/* Intestazione araldica */}
        <div className="relative border-b border-[#b8862f]/35 px-5 pb-4 pt-5 sm:px-7">
          <div className="flex items-start gap-4">
            <VillageCrest size={54} className="shrink-0 drop-shadow-[0_4px_10px_rgba(58,44,28,0.35)]" />
            <div className="min-w-0 flex-1">
              <span className="fantasy-label text-[10px] font-bold text-[#8a6a12]">
                Borgo Sospeso · Mini-game
              </span>
              <h2 className="fantasy-heading text-xl font-bold leading-tight text-[#3a2c1c] sm:text-[26px]">
                Scheda dell'Esploratore
              </h2>
              <p className="fantasy-script mt-0.5 text-[13px] leading-snug text-[#6b5940]">
                «Nove vivande del borgo si celano tra le case, i ponti e gli alberi: ritrovale tutte
                prima che la clessidra si svuoti.»
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="rounded-xl p-1.5 text-[#8a6a12] transition hover:bg-[#b8862f]/15 hover:text-[#3a2c1c]"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="fantasy-plaque rounded-2xl px-3 py-2">
              <Hourglass className="mb-1 h-4 w-4 text-[#8a6a12]" aria-hidden />
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Durata</div>
              <div className="text-[13px] font-extrabold text-[#3a2c1c]">
                {HUNT_DURATION_MS / 1000} secondi
              </div>
            </div>
            <div className="fantasy-plaque rounded-2xl px-3 py-2">
              <Coins className="mb-1 h-4 w-4 text-[#8a6a12]" aria-hidden />
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Valore</div>
              <div className="text-[13px] font-extrabold text-[#3a2c1c]">5–10 pt a figurina</div>
            </div>
            <div className="fantasy-plaque rounded-2xl px-3 py-2">
              <Ticket className="mb-1 h-4 w-4 text-[#2f7d5c]" aria-hidden />
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Premio top</div>
              <div className="text-[13px] font-extrabold text-[#3a2c1c]">Pass x2 Dante VIP</div>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          {/* Come si gioca */}
          <section>
            <FlourishDivider label="Come si gioca" />
            <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-[#4a3a26]">
              <li className="flex gap-2">
                <Sun className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#cfa436]" aria-hidden />
                <span>
                  Le figurine sono <strong>oggetti 3D mimetizzati nel borgo</strong>: niente icone né
                  etichette. Ruota la visuale, avvicina la camera e osservale bene.
                </span>
              </li>
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a9512f]" aria-hidden />
                <span>
                  Ogni figurina è <strong>cliccabile una sola volta</strong>: al tocco si scopre il
                  suo valore e resta nel borgo in versione dorata.
                </span>
              </li>
              <li className="flex gap-2">
                <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a9512f]" aria-hidden />
                <span>
                  <strong>Combo gastronomiche</strong>: due figurine coerenti toccate di fila (es.
                  pizza + vino, bistecca + patate) valgono <strong>+3 pt immediati</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5d94bb]" aria-hidden />
                <span>
                  La clessidra parte al <strong>primo tocco</strong> o dal pulsante qui sotto: poi hai
                  20 o 30 secondi per accumulare punti: la durata è assegnata dal test A/B.
                </span>
              </li>
            </ul>
          </section>

          {/* Figurine da trovare */}
          <section>
            <FlourishDivider label="Le nove figurine" />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`fantasy-chip flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                    item.revealed ? 'fantasy-chip--found' : ''
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#fffdf6] text-base shadow-inner shadow-[#b8862f]/25">
                    {item.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold capitalize text-[#3a2c1c]">
                    {item.label}
                  </span>
                  <span className="fantasy-label shrink-0 text-[9px] font-bold text-[#8a6a12]">
                    {item.area.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
            <p className="fantasy-script mt-2 text-[11.5px] text-[#6b5940]">
              Suggerimento degli abitanti: le nove figurine riposano accanto a case, alberi, ponti e
              moli… guarda dove il borgo è più fitto.
            </p>
          </section>

          {/* Zero-Loss: voucher per tutti */}
          <section>
            <div className="rounded-3xl border-2 border-dashed border-[#2f7d5c]/55 bg-gradient-to-br from-[#f2fbf5]/95 to-[#dcefe2]/70 px-4 py-3">
              <div className="flex items-start gap-3">
                <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-[#2f7d5c]" aria-hidden />
                <div className="min-w-0">
                  <div className="fantasy-label text-[9.5px] font-bold text-[#2f7d5c]">
                    Zero-Loss Strategy
                  </div>
                  <div className="fantasy-heading text-[14.5px] font-bold leading-snug text-[#3a2c1c]">
                    Voucher 10€ Aperitivo Cena Dante Festival per tutti
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#4a3a26]">
                    Qualunque sia il punteggio ricevi un <strong>QR code personale</strong> con
                    voucher da 10€ per l'esclusivo format <em>Aperitivo Cena</em>, valido
                    presentandosi in <strong>2 persone</strong>. Il claim resta attivo{' '}
                    <strong>{VOUCHER_VALIDITY_HOURS} ore</strong> e si finalizza sullo store
                    ufficiale del festival.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Scala dei premi */}
          <section>
            <FlourishDivider label="Medaglie e premi" />
            <div className="mt-3 space-y-2">
              {ladder.map(tier => (
                <div
                  key={tier.id}
                  className="fantasy-plaque flex items-center gap-3 rounded-2xl px-3 py-2"
                >
                  <MedalBadge tier={tier} size={36} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="fantasy-heading text-[13px] font-bold text-[#3a2c1c]">
                      {tier.title}
                    </div>
                    <div className="text-[11px] font-semibold text-[#6b5940]">
                      {tier.max === null
                        ? `${tier.min} pt o più`
                        : tier.id === 'none'
                          ? `meno di ${tier.max + 1} pt`
                          : `${tier.min} – ${tier.max} pt`}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-[#8a6a12]">{tier.prize}</div>
                  </div>
                  {tier.givesFestivalPass ? (
                    <span className="fantasy-ribbon flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-bold">
                      <Crown className="h-3 w-3" aria-hidden />
                      {tier.isVip ? 'VIP + Backstage' : 'Pass x2'}
                    </span>
                  ) : (
                    <Users className="h-4 w-4 shrink-0 text-[#2f7d5c]/70" aria-hidden />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6b5940]">
              <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-[#8a6a12]" aria-hidden />
              Tutti i premi si riscattano sullo store e-commerce ufficiale del Dante Festival: il
              codice voucher arriva già applicato al carrello.
            </p>
          </section>

          {/* Progressi dell'esploratore */}
          <section>
            <FlourishDivider label="Il tuo taccuino" />
            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-[#b8862f]/30 bg-[#fffdf6]/70 px-4 py-3">
              <WaxSeal
                tone={totalVouchers > 0 ? 'emerald' : 'gold'}
                lines={
                  record.bestScore > 0
                    ? [rank.title, `${record.bestScore} pt`]
                    : ['Rango', 'Novizio']
                }
                className="h-[74px] w-[74px] shrink-0"
              />
              <div className="min-w-0 flex-1 text-[12px] text-[#4a3a26]">
                <div className="flex items-center gap-1.5">
                  <Scroll className="h-3.5 w-3.5 text-[#8a6a12]" aria-hidden />
                  <strong className="fantasy-heading text-[13px]">{rank.title}</strong>
                </div>
                <p className="mt-0.5 text-[11.5px] text-[#6b5940]">{rank.note}</p>
                <p className="mt-1 text-[11.5px]">
                  Figurine ritrovate nell'ultima caccia:{' '}
                  <strong>
                    {foundNow}/{items.length}
                  </strong>
                </p>
                <p className="text-[11.5px]">
                  Codice invito:{' '}
                  <strong className="font-mono">{record.referralId || '—'}</strong>
                </p>
                <p className="text-[11.5px]">
                  Voucher nel taccuino:{' '}
                  <strong>{totalVouchers}</strong>
                  {totalVouchers > 0 && (
                    <span className="ml-1 font-mono text-[10.5px] text-[#2f7d5c]">
                      {record.vouchers.map(voucher => voucher.code).join(', ')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Azioni */}
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-[#b8862f]/35 bg-[#f7edd6]/92 px-5 py-4 backdrop-blur-md sm:flex-row sm:px-7">
          <button
            type="button"
            onClick={onStart}
            className="fantasy-cta flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold"
          >
            <Play className="w-4 h-4" />
            Inizia la caccia
          </button>
          <button
            type="button"
            onClick={onClose}
            className="fantasy-cta fantasy-cta--quiet flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold"
          >
            <Compass className="w-4 h-4 text-[#5d94bb]" />
            Esplora il borgo
          </button>
        </div>
      </div>
    </div>
  );
};
