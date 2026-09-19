import { TierDefinition, TierId } from './treasureCatalog';
import { createQrDataUrl } from './qrCode';

/**
 * Share card generata lato client: una visual card pronta da pubblicare o
 * salvare, con medaglia, punteggio, titolo utente, claim del voucher Aperitivo
 * Cena e QR code con referral univoco.
 */

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
  qrPayload: string;
  referralId: string;
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = word;
      if (lines >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines;
}

/**
 * Disegna la share card su canvas e restituisce un data URL PNG.
 * Restituisce null quando il canvas non è disponibile (ambienti headless).
 */
export async function renderShareCard(data: ShareCardData): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const width = 900;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const palette = TIER_COLORS[data.tier.id];

    // Cielo del borgo sospeso
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0d2138');
    sky.addColorStop(0.34, '#2a5f8e');
    sky.addColorStop(0.66, '#7fb2d6');
    sky.addColorStop(1, '#e9f3fa');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Bagliori e pulviscolo
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.7;
      const r = Math.random() * 2.2 + 0.4;
      ctx.globalAlpha = 0.18 + Math.random() * 0.5;
      ctx.fillStyle = '#fdf6e6';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Cornice dorata
    ctx.strokeStyle = 'rgba(207,164,54,0.9)';
    ctx.lineWidth = 6;
    roundRect(ctx, 28, 28, width - 56, height - 56, 34);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(244,224,164,0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, 44, 44, width - 88, height - 88, 26);
    ctx.stroke();

    // Titolo
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fdf6e6';
    ctx.font = '700 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('DANTE FESTIVAL', width / 2, 128);
    ctx.font = '800 58px Cinzel, Georgia, serif';
    ctx.fillText('CACCIA AI TESORI', width / 2, 196);
    ctx.font = 'italic 34px "IM Fell English", Georgia, serif';
    ctx.fillStyle = 'rgba(253,246,230,0.85)';
    ctx.fillText('del borgo sospeso', width / 2, 244);

    // Medaglia
    const medalY = 396;
    const medalGradient = ctx.createRadialGradient(width / 2 - 40, medalY - 46, 20, width / 2, medalY, 150);
    medalGradient.addColorStop(0, palette.light);
    medalGradient.addColorStop(0.55, palette.mid);
    medalGradient.addColorStop(1, palette.dark);
    ctx.beginPath();
    ctx.arc(width / 2, medalY, 138, 0, Math.PI * 2);
    ctx.fillStyle = medalGradient;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(43,28,6,0.55)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, medalY, 112, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 4;
    ctx.stroke();
    if (data.tier.id === 'diamond') {
      ctx.save();
      ctx.translate(width / 2, medalY);
      ctx.fillStyle = 'rgba(43,28,6,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -78);
      ctx.lineTo(52, -26);
      ctx.lineTo(0, 78);
      ctx.lineTo(-52, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.lineTo(36, -20);
      ctx.lineTo(0, 56);
      ctx.lineTo(-36, -20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (data.tier.id !== 'none') {
      drawStar(ctx, width / 2, medalY, 84, 36, 'rgba(43,28,6,0.75)');
      drawStar(ctx, width / 2, medalY - 4, 58, 24, 'rgba(255,255,255,0.7)');
    } else {
      ctx.font = '800 96px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(43,28,6,0.7)';
      ctx.fillText('?', width / 2, medalY + 34);
    }

    // Nastro tier
    ctx.font = '700 34px Cinzel, Georgia, serif';
    const tierLabel = data.tier.id === 'none' ? 'Nessuna medaglia' : `Medaglia di ${data.tier.medalName}`;
    const ribbonWidth = Math.max(320, ctx.measureText(tierLabel).width + 80);
    ctx.fillStyle = '#a9512f';
    roundRect(ctx, width / 2 - ribbonWidth / 2, 552, ribbonWidth, 62, 31);
    ctx.fill();
    ctx.fillStyle = '#fdf1e2';
    ctx.font = '700 30px Cinzel, Georgia, serif';
    ctx.fillText(tierLabel, width / 2, 594);

    // Punteggio e titolo utente
    ctx.fillStyle = '#12293f';
    ctx.font = '800 96px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`${data.score} pt`, width / 2, 730);
    ctx.font = '700 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(18,41,63,0.78)';
    ctx.fillText(
      `${data.userTitle} · ${data.foundCount}/${data.totalCount} figurine${data.comboCount > 0 ? ` · ${data.comboCount} combo` : ''}`,
      width / 2,
      774
    );

    // Voucher Aperitivo Cena
    const voucherY = 824;
    ctx.fillStyle = 'rgba(253,246,230,0.94)';
    roundRect(ctx, 78, voucherY, width - 156, 208, 26);
    ctx.fill();
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.strokeStyle = 'rgba(184,134,47,0.9)';
    ctx.lineWidth = 4;
    roundRect(ctx, 78, voucherY, width - 156, 208, 26);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#2f7d5c';
    ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('PREMIO SBLOCCATO', 118, voucherY + 48);
    ctx.fillStyle = '#2b1c06';
    ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
    wrapText(ctx, data.voucherLabel, 118, voucherY + 92, width - 156 - 300, 36, 2);
    ctx.fillStyle = 'rgba(43,28,6,0.72)';
    ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(data.voucherRule, 118, voucherY + 168);

    // QR code con referral
    const qr = await createQrDataUrl(data.qrPayload, { size: 300, light: '#fdf6e6' });
    if (qr) {
      const image = await new Promise<HTMLImageElement | null>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = qr;
      });
      if (image) {
        ctx.fillStyle = '#fdf6e6';
        roundRect(ctx, width - 156 - 216, voucherY + 16, 196, 176, 18);
        ctx.fill();
        ctx.drawImage(image, width - 156 - 210, voucherY + 22, 184, 164);
      }
    }

    // Footer con link referral
    ctx.textAlign = 'center';
    ctx.fillStyle = '#12293f';
    ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Inquadra il QR e sfida il borgo', width / 2, 1086);
    ctx.fillStyle = 'rgba(18,41,63,0.7)';
    ctx.font = '600 21px "Plus Jakarta Sans", system-ui, sans-serif';
    wrapText(ctx, data.referralLink, width / 2, 1122, width - 200, 28, 2);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
