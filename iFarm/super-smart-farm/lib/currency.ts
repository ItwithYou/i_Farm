// lib/currency.ts
// Currency conversion utilities. Uses decimal.js for exact arithmetic — never
// JS floats — and an effective-dated rate map keyed to the base currency (LAK).
import Decimal from "decimal.js";
import type { Currency } from "@prisma/client";

// Round-half-up, 2 dp for display money values.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export const BASE_CURRENCY: Currency = "LAK";

/** A rate map: foreign currency -> LAK value of 1 unit. LAK is always 1. */
export type RateMap = Record<Currency, Decimal>;

export interface MultiCurrencyAmount {
  amountLak: Decimal.Value;
  amountThb: Decimal.Value;
  amountUsd: Decimal.Value;
  amountCny: Decimal.Value;
}

/**
 * Convert a multi-currency ledger line into a single LAK total.
 * Each currency leg is converted independently then summed — this correctly
 * handles a line that mixes, say, 500,000 LAK cash + $50 USD in one transaction.
 */
export function toLakEquivalent(amounts: MultiCurrencyAmount, rates: RateMap): Decimal {
  return new Decimal(amounts.amountLak)
    .plus(new Decimal(amounts.amountThb).times(rates.THB))
    .plus(new Decimal(amounts.amountUsd).times(rates.USD))
    .plus(new Decimal(amounts.amountCny).times(rates.CNY))
    .toDecimalPlaces(2);
}

/**
 * Build a RateMap from ExchangeRate rows. LAK is implicitly 1. Any foreign
 * currency without a row defaults to 0 (so a missing rate fails loudly rather
 * than silently mis-converting).
 */
export function buildRateMap(
  rateRows: { currency: Currency; rateToLak: Decimal.Value }[],
): RateMap {
  const map: RateMap = {
    LAK: new Decimal(1),
    THB: new Decimal(0),
    USD: new Decimal(0),
    CNY: new Decimal(0),
  };
  for (const r of rateRows) map[r.currency] = new Decimal(r.rateToLak);
  return map;
}

/** Format a LAK amount for the dashboard, e.g. "₭ 12,500,000". */
export function formatLak(value: Decimal.Value): string {
  return `₭ ${new Decimal(value).toNumber().toLocaleString("lo-LA", {
    maximumFractionDigits: 0,
  })}`;
}
