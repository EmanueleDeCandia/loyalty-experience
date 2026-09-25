import { TierDefinition, TierId } from './treasureCatalog';
import { createQrDataUrl } from './qrCode';

export type SocialFormat = 'story' | 'feed';

export interface SponsorOption {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string;
  badgeText: string;
}

export const AVAILABLE_SPONSORS: SponsorOption[] = [
  {
    id: 'dante_official',
    name: 'Dante Festival',
    tagline: 'Partner Istituzionale Ufficiale',
    logoUrl: '/sponsors/sponsor-dante.svg',
    badgeText: 'Main Partner',
  },
  {
    id: 'cantine_borgo',
    name: 'Cantine del Borgo',
    tagline: 'Vini d’Eccellenza & Aperitivi',
    logoUrl: '/sponsors/sponsor-cantine.svg',
    badgeText: 'Wine Partner',
  },
  {
    id: 'osteria_dantesca',
    name: 'Osteria Dantesca',
    tagline: 'Sapori Tipici & Aperitivi del Festival',
    logoUrl: '/sponsors/sponsor-osteria.svg',
    badgeText: 'Food Partner',
  },
  {
    id: 'botteghe_borgo',
    name: 'Botteghe del Borgo',
    tagline: 'Artigianato Storico & Tradizione',
    logoUrl: '/sponsors/sponsor-artigianato.svg',
    badgeText: 'Craft Partner',
  },
];

export interface ShareCardData {
  tier: TierDefinition;
  score: number;
  userTitle: string;
  foundCount: number;
  totalCount: number;
  comboCount: number;
  voucherLabel: string;
  voucherRule: string;
  referralLink: string;
  referralId: string;
  format?: SocialFormat;
  sponsor?: SponsorOption;
}

const TIER_COLORS: Record<TierId, { light: string; mid: string; dark: string }> = {
  none: { light: '#f8fafc', mid: '#cbd5e1', dark: '#94a3b8' },
  silver: { light: '#ffffff', mid: '#dbe4ee', dark: '#8fa3b8' },
  gold: { light: '#fffaea', mid: '#ffd873', dark: '#d98f14' },
  platinum: { light: '#ffffff', mid: '#e6eef8', dark: '#a3b4cd' },
  diamond: { light: '#ffffff', mid: '#dcf7ff', dark: '#7cc9f0' },
};

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Disegna la share card in formato ottimizzato:
 * - 'story' (9:16, 1080x1920): Instagram Stories, TikTok, Facebook Stories, WhatsApp Status
 * - 'feed' (1:1, 1080x1080): Instagram & Facebook Post
 * 
 * Integra il QR code per SFIDARE il borgo con il link referral personale,
 * e il logo/banner dello sponsor prescelto.
 */
export async function renderShareCard(data: ShareCardData): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const isStory = data.format !== 'feed'; // default is story (9:16)
    const width = 1080;
    const height = isStory ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const palette = TIER_COLORS[data.tier.id];
    const sponsor = data.sponsor || AVAILABLE_SPONSORS[0];

    // Sfondo: cielo crepuscolare del borgo sospeso
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#071626');
    sky.addColorStop(0.28, '#183c5e');
    sky.addColorStop(0.62, '#487ea9');
    sky.addColorStop(1, '#c5def0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Particelle dorate e stelle nel cielo
    for (let i = 0; i < (isStory ? 120 : 70); i++) {
      const px = Math.random() * width;
      const py = Math.random() * height * 0.75;
      const pr = Math.random() * 2.5 + 0.5;
      ctx.globalAlpha = 0.2 + Math.random() * 0.55;
      ctx.fillStyle = i % 3 === 0 ? '#ffd873' : '#fdf6e6';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Cornice dorata elegante
    ctx.strokeStyle = 'rgba(207,164,54,0.92)';
    ctx.lineWidth = 8;
    roundRect(ctx, 32, 32, width - 64, height - 64, 40);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(244,224,164,0.45)';
    ctx.lineWidth = 2.5;
    roundRect(ctx, 48, 48, width - 96, height - 96, 32);
    ctx.stroke();

    if (isStory) {
      // ==========================================
      // LAYOUT STORIA & TIKTOK (9:16 - 1080 x 1920)
      // ==========================================

      // 1. Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fdf6e6';
      ctx.font = '700 34px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('DANTE FESTIVAL', width / 2, 140);

      ctx.font = '800 68px Cinzel, Georgia, serif';
      ctx.fillStyle = '#ffd873';
      ctx.fillText('CACCIA AI TESORI', width / 2, 220);

      ctx.font = 'italic 38px "IM Fell English", Georgia, serif';
      ctx.fillStyle = 'rgba(253,246,230,0.9)';
      ctx.fillText('del borgo sospeso', width / 2, 275);

      // 2. Medaglione
      const medalY = 510;
      const medalRadius = 160;
      const medalGrad = ctx.createRadialGradient(width / 2 - 40, medalY - 50, 20, width / 2, medalY, 180);
      medalGrad.addColorStop(0, palette.light);
      medalGrad.addColorStop(0.55, palette.mid);
      medalGrad.addColorStop(1, palette.dark);

      ctx.beginPath();
      ctx.arc(width / 2, medalY, medalRadius, 0, Math.PI * 2);
      ctx.fillStyle = medalGrad;
      ctx.fill();

      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(43,28,6,0.6)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, medalY, medalRadius - 28, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 5;
      ctx.stroke();

      if (data.tier.id === 'diamond') {
        ctx.save();
        ctx.translate(width / 2, medalY);
        ctx.fillStyle = 'rgba(43,28,6,0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -90);
        ctx.lineTo(60, -30);
        ctx.lineTo(0, 90);
        ctx.lineTo(-60, -30);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (data.tier.id !== 'none') {
        drawStar(ctx, width / 2, medalY, 100, 44, 'rgba(43,28,6,0.78)');
        drawStar(ctx, width / 2, medalY - 5, 72, 30, 'rgba(255,255,255,0.75)');
      }

      // Nastro Medaglia
      const tierLabel = data.tier.id === 'none' ? 'Esploratore del Borgo' : `Medaglia di ${data.tier.medalName}`;
      ctx.font = '700 36px Cinzel, Georgia, serif';
      const ribbonW = Math.max(420, ctx.measureText(tierLabel).width + 100);
      ctx.fillStyle = '#a9512f';
      roundRect(ctx, width / 2 - ribbonW / 2, 700, ribbonW, 72, 36);
      ctx.fill();
      ctx.strokeStyle = '#f4e0a4';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#fdf1e2';
      ctx.fillText(tierLabel, width / 2, 748);

      // Punteggio & Titolo
      ctx.fillStyle = '#0c2237';
      ctx.font = '900 120px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${data.score} pt`, width / 2, 905);

      ctx.font = '700 36px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(12,34,55,0.85)';
      ctx.fillText(
        `${data.userTitle} · ${data.foundCount}/${data.totalCount} figurine${data.comboCount > 0 ? ` · ${data.comboCount} combo` : ''}`,
        width / 2,
        960
      );

      // 3. Card Invito & QR Code con Referral
      const qrBoxY = 1020;
      const qrBoxH = 500;
      ctx.fillStyle = 'rgba(253,246,230,0.96)';
      roundRect(ctx, 80, qrBoxY, width - 160, qrBoxH, 36);
      ctx.fill();

      ctx.save();
      ctx.setLineDash([16, 12]);
      ctx.strokeStyle = 'rgba(184,134,47,0.95)';
      ctx.lineWidth = 4;
      roundRect(ctx, 80, qrBoxY, width - 160, qrBoxH, 36);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#8a6a12';
      ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('INQUADRA IL QR E SFIDA IL MIO RECORD!', width / 2, qrBoxY + 60);

      // QR Code che punta al referral link (per giocare la caccia!)
      const qrDataUrl = await createQrDataUrl(data.referralLink, { size: 360, light: '#fdf6e6' });
      if (qrDataUrl) {
        const qrImg = await loadImage(qrDataUrl);
        if (qrImg) {
          const qrSize = 250;
          ctx.drawImage(qrImg, width / 2 - qrSize / 2, qrBoxY + 85, qrSize, qrSize);
        }
      }

      // Codice invito in evidenza (non un URL brutto!)
      ctx.fillStyle = '#1d5540';
      ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`CODICE INVITO: ${data.referralId}`, width / 2, qrBoxY + 395);

      ctx.fillStyle = '#6b5940';
      ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Gioca anche tu e sblocca il Voucher 10€ e i Pass Festival', width / 2, qrBoxY + 440);

      // 4. Sezione Sponsor & Co-branding (in basso)
      const sponsorY = 1580;
      const sponsorH = 240;
      ctx.fillStyle = 'rgba(13,33,56,0.92)';
      roundRect(ctx, 80, sponsorY, width - 160, sponsorH, 32);
      ctx.fill();
      ctx.strokeStyle = 'rgba(207,164,54,0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      const sponsorLogo = await loadImage(sponsor.logoUrl);
      if (sponsorLogo) {
        ctx.drawImage(sponsorLogo, 110, sponsorY + 30, 240, 60);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cfa436';
      ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(sponsor.badgeText.toUpperCase(), sponsorLogo ? 380 : 120, sponsorY + 58);

      ctx.fillStyle = '#fdf6e6';
      ctx.font = '800 36px Cinzel, Georgia, serif';
      ctx.fillText(sponsor.name, sponsorLogo ? 380 : 120, sponsorY + 105);

      ctx.fillStyle = 'rgba(253,246,230,0.85)';
      ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(sponsor.tagline, sponsorLogo ? 380 : 120, sponsorY + 148);

      ctx.font = 'italic 20px "IM Fell English", Georgia, serif';
      ctx.fillStyle = '#ffd873';
      ctx.fillText('Partner ufficiale Dante Festival · Esperienza 3D del Borgo', sponsorLogo ? 380 : 120, sponsorY + 185);

    } else {
      // ==========================================
      // LAYOUT FEED / POST QUADRATO (1:1 - 1080 x 1080)
      // ==========================================

      // 1. Header compatto
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fdf6e6';
      ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('DANTE FESTIVAL · CACCIA AI TESORI', width / 2, 105);

      // 2. Colonna sinistra: Medaglia & Punteggio | Colonna destra: QR Invito
      // Medaglia
      const medalX = 300;
      const medalY = 320;
      const medalRadius = 120;
      const medalGrad = ctx.createRadialGradient(medalX - 30, medalY - 35, 15, medalX, medalY, 130);
      medalGrad.addColorStop(0, palette.light);
      medalGrad.addColorStop(0.55, palette.mid);
      medalGrad.addColorStop(1, palette.dark);

      ctx.beginPath();
      ctx.arc(medalX, medalY, medalRadius, 0, Math.PI * 2);
      ctx.fillStyle = medalGrad;
      ctx.fill();

      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(43,28,6,0.6)';
      ctx.stroke();

      if (data.tier.id !== 'none') {
        drawStar(ctx, medalX, medalY, 75, 32, 'rgba(43,28,6,0.75)');
        drawStar(ctx, medalX, medalY - 4, 52, 22, 'rgba(255,255,255,0.75)');
      }

      // Nastro sotto medaglia
      ctx.fillStyle = '#a9512f';
      const tierLabel = data.tier.id === 'none' ? 'Esploratore' : `Medaglia di ${data.tier.medalName}`;
      roundRect(ctx, medalX - 160, 460, 320, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#fdf1e2';
      ctx.font = '700 26px Cinzel, Georgia, serif';
      ctx.fillText(tierLabel, medalX, 496);

      // Punti
      ctx.fillStyle = '#0c2237';
      ctx.font = '900 88px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${data.score} pt`, medalX, 610);

      ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(12,34,55,0.85)';
      ctx.fillText(`${data.foundCount}/${data.totalCount} figurine`, medalX, 655);

      // Box QR a destra
      const qrBoxX = 560;
      const qrBoxY = 170;
      const qrBoxW = 440;
      const qrBoxH = 520;
      ctx.fillStyle = 'rgba(253,246,230,0.96)';
      roundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 30);
      ctx.fill();

      ctx.save();
      ctx.setLineDash([14, 10]);
      ctx.strokeStyle = 'rgba(184,134,47,0.95)';
      ctx.lineWidth = 3.5;
      roundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 30);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#8a6a12';
      ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('INQUADRA E GIOCA!', qrBoxX + qrBoxW / 2, qrBoxY + 50);

      const qrDataUrl = await createQrDataUrl(data.referralLink, { size: 300, light: '#fdf6e6' });
      if (qrDataUrl) {
        const qrImg = await loadImage(qrDataUrl);
        if (qrImg) {
          const qrSize = 220;
          ctx.drawImage(qrImg, qrBoxX + qrBoxW / 2 - qrSize / 2, qrBoxY + 75, qrSize, qrSize);
        }
      }

      ctx.fillStyle = '#1d5540';
      ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`CODICE INVITO`, qrBoxX + qrBoxW / 2, qrBoxY + 340);
      ctx.font = '900 28px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${data.referralId}`, qrBoxX + qrBoxW / 2, qrBoxY + 375);

      ctx.fillStyle = '#6b5940';
      ctx.font = '600 18px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Voucher 10€ sbloccato per tutti', qrBoxX + qrBoxW / 2, qrBoxY + 430);
      ctx.fillText('e Pass x2 Festival ai migliori', qrBoxX + qrBoxW / 2, qrBoxY + 458);

      // Sponsor Bar in basso (Feed)
      const sponsorY = 740;
      const sponsorH = 260;
      ctx.fillStyle = 'rgba(13,33,56,0.92)';
      roundRect(ctx, 80, sponsorY, width - 160, sponsorH, 28);
      ctx.fill();
      ctx.strokeStyle = 'rgba(207,164,54,0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      const sponsorLogo = await loadImage(sponsor.logoUrl);
      if (sponsorLogo) {
        ctx.drawImage(sponsorLogo, 120, sponsorY + 35, 240, 60);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cfa436';
      ctx.font = '800 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(sponsor.badgeText.toUpperCase(), sponsorLogo ? 390 : 120, sponsorY + 60);

      ctx.fillStyle = '#fdf6e6';
      ctx.font = '800 34px Cinzel, Georgia, serif';
      ctx.fillText(sponsor.name, sponsorLogo ? 390 : 120, sponsorY + 105);

      ctx.fillStyle = 'rgba(253,246,230,0.85)';
      ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(sponsor.tagline, sponsorLogo ? 390 : 120, sponsorY + 145);

      ctx.font = 'italic 19px "IM Fell English", Georgia, serif';
      ctx.fillStyle = '#ffd873';
      ctx.fillText('Partner ufficiale Dante Festival · Condividi la sfida con gli amici', sponsorLogo ? 390 : 120, sponsorY + 185);
    }

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
