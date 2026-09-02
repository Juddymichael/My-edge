import { TradeDirection } from '../../types/trade';
import { InvalidTradeError } from '../../types/errors';

/**
 * Normalizes trading direction strings to strict 'BUY' | 'SELL'.
 * Supports English, French (Acheter/Vendre, Achat/Vente), German, and Spanish broker exports.
 */
export function normalizeDirection(rawDirection: unknown): TradeDirection {
  if (typeof rawDirection === 'number') {
    if (rawDirection > 0) return 'BUY';
    if (rawDirection < 0) return 'SELL';
  }

  if (typeof rawDirection !== 'string') {
    throw new InvalidTradeError(`Invalid trade direction type: ${typeof rawDirection}`);
  }

  const cleaned = rawDirection
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents e.g. ACHETÉ -> ACHETE

  switch (cleaned) {
    // English BUY
    case 'BUY':
    case 'LONG':
    case 'B':
    case '1':
    case '+1':
    case 'CALL':
    case 'IN':
    // French BUY
    case 'ACHETER':
    case 'ACHAT':
    case 'ACH':
    case 'ACHETE':
    case 'ACHETEE':
    case 'LONGUE':
    case 'POSITION LONGUE':
    // German / Spanish
    case 'KAUFEN':
    case 'KAUF':
    case 'COMPRA':
    case 'COMPRAR':
      return 'BUY';

    // English SELL
    case 'SELL':
    case 'SHORT':
    case 'S':
    case '-1':
    case 'PUT':
    case 'OUT':
    // French SELL
    case 'VENDRE':
    case 'VENTE':
    case 'VTE':
    case 'VENDU':
    case 'VENDUE':
    case 'COURTE':
    case 'POSITION COURTE':
    // German / Spanish
    case 'VERKAUFEN':
    case 'VERKAUF':
    case 'VENTA':
    case 'VENDER':
      return 'SELL';

    default:
      if (cleaned.includes('BUY') || cleaned.includes('ACHAT') || cleaned.includes('ACHET') || cleaned.includes('LONG')) {
        return 'BUY';
      }
      if (cleaned.includes('SELL') || cleaned.includes('VENT') || cleaned.includes('VEND') || cleaned.includes('SHORT')) {
        return 'SELL';
      }
      throw new InvalidTradeError(`Unrecognized trade direction: "${rawDirection}"`);
  }
}

