import QRCode from 'qrcode';

/**
 * Wrapper attorno al generatore di QR code.
 * Tutte le chiamate sono protette: se il canvas non è disponibile (o il
 * payload è troppo lungo) il chiamante riceve null e mostra il fallback
 * testuale con il codice voucher e il link allo store.
 */

export interface QrOptions {
  size?: number;
  dark?: string;
  light?: string;
}

export async function createQrDataUrl(
  payload: string,
  options: QrOptions = {}
): Promise<string | null> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: options.size ?? 256,
      color: {
        dark: options.dark ?? '#2b1c06',
        light: options.light ?? '#fdf6e6',
      },
    });
  } catch {
    return null;
  }
}
