import { Currency, FuelUnit, ExchangeRates, CachedData, UnitConfig, CurrencyConfig } from './types';

// Exact conversion constants (Liters per unit)
export const UNIT_CONFIGS: Record<FuelUnit, UnitConfig> = {
  L: {
    id: 'L',
    name: 'Liter',
    symbol: 'L',
    litersEquivalent: 1.0,
  },
  US_GAL: {
    id: 'US_GAL',
    name: 'U.S. Gallon',
    symbol: 'U.S. gal',
    litersEquivalent: 3.785411784,
  },
  IMP_GAL: {
    id: 'IMP_GAL',
    name: 'Imperial Gallon',
    symbol: 'Imp gal',
    litersEquivalent: 4.54609,
  },
};

export const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  USD: {
    id: 'USD',
    name: 'U.S. Dollar',
    symbol: '$',
    code: 'USD',
    isSubunit: false,
    subunitFactor: 1.0,
  },
  CAD: {
    id: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    code: 'CAD',
    isSubunit: false,
    subunitFactor: 1.0,
  },
  CAD_CENTS: {
    id: 'CAD_CENTS',
    name: 'Canadian Cents',
    symbol: '¢',
    code: 'CAD',
    isSubunit: true,
    subunitFactor: 0.01,
  },
  MXN: {
    id: 'MXN',
    name: 'Mexican Peso',
    symbol: 'Mex$',
    code: 'MXN',
    isSubunit: false,
    subunitFactor: 1.0,
  },
};

// Default standard exchange rates to fall back on if completely offline and no cache
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  USD: 1.0,
  CAD: 1.412,
  MXN: 20.15,
};

/**
 * Converts fuel price from a source currency and unit to a target currency and unit.
 * 
 * @param price - Input fuel price (e.g. 150.9 for CAD Cents/L, or 3.49 for USD/gal)
 * @param fromCurrency - Source Currency config ID
 * @param fromUnit - Source Unit config ID
 * @param toCurrency - Target Currency config ID
 * @param toUnit - Target Unit config ID
 * @param rates - Current exchange rates relative to USD
 * @returns The converted numeric price
 */
export function convertFuelPrice(
  price: number,
  fromCurrency: Currency,
  fromUnit: FuelUnit,
  toCurrency: Currency,
  toUnit: FuelUnit,
  rates: ExchangeRates
): number {
  if (isNaN(price) || price <= 0) return 0;

  const currentFromConfig = CURRENCY_CONFIGS[fromCurrency];
  const currentToConfig = CURRENCY_CONFIGS[toCurrency];
  const currentFromUnit = UNIT_CONFIGS[fromUnit];
  const currentToUnit = UNIT_CONFIGS[toUnit];

  // 1. Convert input price in its native representation to Standard Base Currency (whole code, e.g. CAD, USD, MXN)
  // Example: 150.9 CAD_CENTS/L -> 1.509 CAD/L
  const standardInputPrice = price * currentFromConfig.subunitFactor;

  // 2. Convert standard currency price to USD price
  // rates are base: USD (so rates.CAD is CAD per 1 USD)
  // USD_price = price_in_CAD / rates.CAD
  const rateForInput = rates[currentFromConfig.code];
  const inputPriceInUSDPerUnit = standardInputPrice / rateForInput;

  // 3. Convert USD per source-unit to USD per LITER
  // If price is $3.78 per US gallon, then price per liter is $3.78 / 3.7854
  const priceInUSDPerLiter = inputPriceInUSDPerUnit / currentFromUnit.litersEquivalent;

  // 4. Convert price in USD per Liter to USD per target-unit
  // If price is $1.00 per Liter, then price per Imp gal is $1.00 * 4.54609
  const targetPriceInUSD = priceInUSDPerLiter * currentToUnit.litersEquivalent;

  // 5. Convert price in USD to target standard currency
  // price_in_target = price_in_USD * rates.TARGET
  const rateForOutput = rates[currentToConfig.code];
  const standardOutputPrice = targetPriceInUSD * rateForOutput;

  // 6. Convert target standard currency to its subunit representation if needed
  // Example: CAD to CAD_CENTS (standard price / 0.01)
  const finalPrice = standardOutputPrice / currentToConfig.subunitFactor;

  return finalPrice;
}

/**
 * Fetch fresh exchange rates from open.er-api.com
 */
export async function fetchExchangeRates(): Promise<CachedData> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates (Status: ${response.status})`);
    }
    const data = await response.json();
    
    if (data.result === 'success' && data.rates) {
      const activeRates: ExchangeRates = {
        USD: 1.0,
        CAD: Number(data.rates.CAD) || DEFAULT_EXCHANGE_RATES.CAD,
        MXN: Number(data.rates.MXN) || DEFAULT_EXCHANGE_RATES.MXN,
      };

      return {
        rates: activeRates,
        lastUpdated: data.time_last_update_utc || new Date().toUTCString(),
        fetchedAt: Date.now(),
      };
    } else {
      throw new Error('Invalid response structure from ExchangeRate API');
    }
  } catch (error) {
    console.error('Exchange rate fetch error, returning local rates fallback:', error);
    throw error;
  }
}

/**
 * Formats a Date/time standardly
 */
export function formatLastUpdatedDate(dateStringOrTimestamp: string | number): string {
  try {
    const d = new Date(dateStringOrTimestamp);
    if (isNaN(d.getTime())) return 'Unknown';
    
    // Return custom formatted, eye-safe date string
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Format currency and decimals perfectly
 */
export function formatFuelPrice(price: number, currency: Currency): string {
  if (price === 0) return '0.00';
  
  const config = CURRENCY_CONFIGS[currency];
  
  // Custom smart decimal rounding
  // For standard currencies, standard fuel display is usually 3 decimal places (e.g. $3.499)
  // For cents or subunits, 1 or 2 decimal places is common (e.g. 150.9¢)
  const decimals = config.id === 'CAD_CENTS' ? 1 : 3;
  
  const formattedNum = price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${config.symbol}${formattedNum}`;
}

/**
 * Standard templates for quick conversion presets.
 */
export interface ConversionPreset {
  testVal: number;
  fromCurrency: Currency;
  fromUnit: FuelUnit;
  label: string;
}

export const CONVERSION_PRESETS: ConversionPreset[] = [
  {
    testVal: 150.9,
    fromCurrency: 'CAD_CENTS',
    fromUnit: 'L',
    label: 'Standard Canadian highway price (150.9 ¢/L)',
  },
  {
    testVal: 3.499,
    fromCurrency: 'USD',
    fromUnit: 'US_GAL',
    label: 'Standard U.S. gas station price ($3.499 / U.S. gal)',
  },
  {
    testVal: 21.80,
    fromCurrency: 'MXN',
    fromUnit: 'L',
    label: 'Standard Mexican Magna price (Mex$21.80 / L)',
  },
];
