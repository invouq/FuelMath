/**
 * Types and interfaces for Fuel Price Converter
 */

export type Currency = 'USD' | 'CAD' | 'CAD_CENTS' | 'MXN';

export type FuelUnit = 'L' | 'US_GAL' | 'IMP_GAL';

export interface ExchangeRates {
  USD: number;
  CAD: number;
  MXN: number;
}

export interface CachedData {
  rates: ExchangeRates;
  lastUpdated: string; // ISO string or UTC string from API
  fetchedAt: number;   // Timestamp (ms)
}

export interface UnitConfig {
  id: FuelUnit;
  name: string;
  symbol: string;
  litersEquivalent: number;
}

export interface CurrencyConfig {
  id: Currency;
  name: string;
  symbol: string;
  code: 'USD' | 'CAD' | 'MXN';
  isSubunit: boolean; // CAD Cents is a subunit of CAD
  subunitFactor: number; // 0.01 for CAD Cents to CAD
}
