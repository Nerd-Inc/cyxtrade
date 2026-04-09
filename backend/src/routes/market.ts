import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const router = Router();
const MARKET_CACHE_TTL_MS = 60_000;

type BaseRatesCache = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
  expiresAt: number;
  provider: string;
};

const baseRatesCache = new Map<string, BaseRatesCache>();

const getQueryParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const toCurrencyCode = (value: string): string => {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Currency code must be 3 letters');
  }
  return code;
};

async function fetchBaseRates(base: string): Promise<BaseRatesCache> {
  const now = Date.now();
  const cached = baseRatesCache.get(base);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!response.ok) {
    throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Failed to fetch market rates');
  }

  const payload = await response.json() as {
    result?: string;
    rates?: Record<string, number>;
  };

  if (payload.result !== 'success' || !payload.rates) {
    throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Market rate provider returned invalid response');
  }

  const entry: BaseRatesCache = {
    base,
    rates: payload.rates,
    fetchedAt: now,
    expiresAt: now + MARKET_CACHE_TTL_MS,
    provider: 'open.er-api',
  };

  baseRatesCache.set(base, entry);
  return entry;
}

// GET /api/market/rate?from=AED&to=XAF
router.get('/rate', asyncHandler(async (req, res) => {
  const from = toCurrencyCode(getQueryParam(req.query.from as string | string[] | undefined));
  const to = toCurrencyCode(getQueryParam(req.query.to as string | string[] | undefined));

  if (from === to) {
    sendSuccess(res, {
      from,
      to,
      rate: 1,
      source: 'market',
      provider: 'identity',
      fetchedAt: new Date().toISOString(),
      cacheTtlMs: MARKET_CACHE_TTL_MS,
    });
    return;
  }

  const baseRates = await fetchBaseRates(from);
  const rate = baseRates.rates[to];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Market rate not available for ${from}/${to}`);
  }

  sendSuccess(res, {
    from,
    to,
    rate,
    source: 'market',
    provider: baseRates.provider,
    fetchedAt: new Date(baseRates.fetchedAt).toISOString(),
    cacheTtlMs: Math.max(baseRates.expiresAt - Date.now(), 0),
  });
}));

export default router;
