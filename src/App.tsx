import React, { useState, useEffect } from 'react';
import { 
  Fuel, 
  HelpCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Globe, 
  Smartphone, 
  Info, 
  Sliders, 
  Coins, 
  TrendingUp, 
  ChevronRight, 
  RotateCcw,
  Check,
  Percent,
  Calculator,
  Grid,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  LockOpen
} from 'lucide-react';
import { Currency, FuelUnit, ExchangeRates, CachedData } from './types';
import { 
  UNIT_CONFIGS, 
  CURRENCY_CONFIGS, 
  DEFAULT_EXCHANGE_RATES, 
  convertFuelPrice, 
  fetchExchangeRates, 
  formatLastUpdatedDate, 
  formatFuelPrice, 
  CONVERSION_PRESETS 
} from './utils';

export default function App() {
  // Input State
  const [inputValue, setInputValue] = useState<string>('150.9');
  const [inputCurrency, setInputCurrency] = useState<Currency>('CAD_CENTS');
  const [inputUnit, setInputUnit] = useState<FuelUnit>('L');

  // Custom targets state
  const [targetCurrency, setTargetCurrency] = useState<Currency>('USD');
  const [targetUnit, setTargetUnit] = useState<FuelUnit>('US_GAL');

  // Exchange rates state
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [lastUpdated, setLastUpdated] = useState<string>('May 24, 2026, 09:30 PM UTC');
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Connection mode simulation
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);

  // Manual Sandbox adjustments
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [sandboxCad, setSandboxCad] = useState<number>(1.412);
  const [sandboxMxn, setSandboxMxn] = useState<number>(20.15);

  // Active rates being used for calculation
  const activeRates: ExchangeRates = isSandboxMode 
    ? { USD: 1.0, CAD: sandboxCad, MXN: sandboxMxn }
    : rates;

  // Track simulated phone theme
  const [phoneColor, setPhoneColor] = useState<'slate' | 'violet' | 'emerald'>('slate');

  // Handle live rates load
  const loadRates = async (forceRefetch = false) => {
    if (simulatedOffline) {
      setErrorStatus('Cannot update: App is in simulated offline mode.');
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);
    try {
      // Look up inside localStorage first
      const cached = localStorage.getItem('fuel_converter_rates');
      let useCache = false;

      if (cached && !forceRefetch) {
        const parsed: CachedData = JSON.parse(cached);
        const ageInMs = Date.now() - parsed.fetchedAt;
        const oneDayInMs = 24 * 60 * 60 * 1000;

        // If cache is fresh (< 24 hrs), use cached data
        if (ageInMs < oneDayInMs) {
          setRates(parsed.rates);
          setSandboxCad(parsed.rates.CAD);
          setSandboxMxn(parsed.rates.MXN);
          setLastUpdated(parsed.lastUpdated);
          setIsOfflineCached(true);
          useCache = true;
          setIsLoading(false);
          return;
        }
      }

      // Try fetching fresh values if not using cache
      if (!useCache) {
        const freshData = await fetchExchangeRates();
        setRates(freshData.rates);
        setSandboxCad(freshData.rates.CAD);
        setSandboxMxn(freshData.rates.MXN);
        setLastUpdated(freshData.lastUpdated);
        setIsOfflineCached(false);
        // Persist to cache
        localStorage.setItem('fuel_converter_rates', JSON.stringify(freshData));
      }
    } catch (err: any) {
      console.warn('Network error or API rate-limited, falling back to local cache/default rates.');
      // Fallback: If cache exists even if stale, use it!
      const cached = localStorage.getItem('fuel_converter_rates');
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        setRates(parsed.rates);
        setSandboxCad(parsed.rates.CAD);
        setSandboxMxn(parsed.rates.MXN);
        setLastUpdated(parsed.lastUpdated);
        setIsOfflineCached(true);
        setErrorStatus('Network request failed. Using stored cached rates.');
      } else {
        // use compile-time defaults
        setRates(DEFAULT_EXCHANGE_RATES);
        setSandboxCad(DEFAULT_EXCHANGE_RATES.CAD);
        setSandboxMxn(DEFAULT_EXCHANGE_RATES.MXN);
        setLastUpdated('May 24, 2026, 09:30 PM UTC (Built-in Fallback)');
        setIsOfflineCached(true);
        setErrorStatus('Offline and no cached data found. Using built-in rates.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadRates();
  }, []);

  // Sync sandbox with loaded rates when sandbox is off
  useEffect(() => {
    if (!isSandboxMode) {
      setSandboxCad(rates.CAD);
      setSandboxMxn(rates.MXN);
    }
  }, [rates, isSandboxMode]);

  // Adjust rates when simulated offline status changes
  useEffect(() => {
    if (simulatedOffline) {
      setIsOfflineCached(true);
      setErrorStatus('Simulating Offline: Using local cached rates.');
    } else {
      setErrorStatus(null);
      loadRates();
    }
  }, [simulatedOffline]);

  const numericPrice = parseFloat(inputValue) || 0;

  // Quick conversions requested by user:
  // Convert current input to USD per US Gallon
  const convertedToUSDPerUSGal = convertFuelPrice(
    numericPrice,
    inputCurrency,
    inputUnit,
    'USD',
    'US_GAL',
    activeRates
  );

  // Convert current input to Mexican Pesos per Liter
  const convertedToMXNPerLiter = convertFuelPrice(
    numericPrice,
    inputCurrency,
    inputUnit,
    'MXN',
    'L',
    activeRates
  );

  // CAD Dollars per Liter
  const convertedToCADPerLiter = convertFuelPrice(
    numericPrice,
    inputCurrency,
    inputUnit,
    'CAD',
    'L',
    activeRates
  );

  // Convertible list for custom targets
  const customConvertedResult = convertFuelPrice(
    numericPrice,
    inputCurrency,
    inputUnit,
    targetCurrency,
    targetUnit,
    activeRates
  );

  // Quick preset loader helper
  const applyPreset = (preset: typeof CONVERSION_PRESETS[0]) => {
    setInputValue(preset.testVal.toString());
    setInputCurrency(preset.fromCurrency);
    setInputUnit(preset.fromUnit);
  };

  // Build simulated status bar time
  const [deviceTime, setDeviceTime] = useState('21:50');
  useEffect(() => {
    // Keep internal simulated device time looking realistic based on current time
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours().toString().padStart(2, '0');
      let mins = now.getMinutes().toString().padStart(2, '0');
      setDeviceTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate dynamic steps explanation based on math:
  const getCalculationSteps = () => {
    const fromConf = CURRENCY_CONFIGS[inputCurrency];
    const fromUnt = UNIT_CONFIGS[inputUnit];
    
    // Step 1: Subunit alignment
    const step1InStandardVal = numericPrice * fromConf.subunitFactor;
    const step1Explanation = fromConf.isSubunit 
      ? `Step 1 (Subunit Conversion): ${numericPrice} ${fromConf.name} is multiplied by ${fromConf.subunitFactor} to get standard currency: ${step1InStandardVal.toFixed(4)} ${fromConf.code} per ${fromUnt.symbol}.`
      : `Step 1 (Currency Standard): Value is already in standard currency: ${step1InStandardVal.toFixed(4)} ${fromConf.code} per ${fromUnt.symbol}.`;

    // Step 2: Rate conversion to USD
    const rateToUse = activeRates[fromConf.code];
    const inUSDPerUnit = step1InStandardVal / rateToUse;
    const step2Explanation = `Step 2 (Exchange to USD Base): Convert ${fromConf.code} to USD by dividing by exchange rate of ${rateToUse} (${fromConf.code} per 1 USD): ${step1InStandardVal.toFixed(4)} / ${rateToUse} = $${inUSDPerUnit.toFixed(4)} USD per ${fromUnt.symbol}.`;

    // Step 3: Liter conversion
    const inUSDPerLiter = inUSDPerUnit / fromUnt.litersEquivalent;
    const step3Explanation = `Step 3 (Metric Liters Normalization): Convert price from per ${fromUnt.symbol} to per Liter (Standard Metric Unit) by dividing by ${fromUnt.litersEquivalent} liters/unit: $${inUSDPerUnit.toFixed(4)} / ${fromUnt.litersEquivalent} = $${inUSDPerLiter.toFixed(4)} USD per Liter.`;

    // Let's explain target USD/US Gallon conversion:
    const usdPerGalTarget = inUSDPerLiter * UNIT_CONFIGS['US_GAL'].litersEquivalent;
    const stepUSDGalExplanation = `• To U.S. Dollars per U.S. Gallon: Multiply USD/Liter ($${inUSDPerLiter.toFixed(4)}) by 3.78541 liters/gallon = $${usdPerGalTarget.toFixed(3)} USD / U.S. gal.`;

    // Let's explain target MXN/Liter conversion:
    const mxnPerLiterTarget = (inUSDPerLiter * activeRates['MXN']);
    const stepMXNLitExplanation = `• To Mexican Pesos per Liter: Multiply USD/Liter ($${inUSDPerLiter.toFixed(4)}) by MXN rate of ${activeRates['MXN']} Mex$/USD = Mex$${mxnPerLiterTarget.toFixed(3)} MXY / Liter.`;

    return {
      step1Explanation,
      step2Explanation,
      step3Explanation,
      stepUSDGalExplanation,
      stepMXNLitExplanation,
      baseUSDPerLiter: inUSDPerLiter
    };
  };

  const steps = getCalculationSteps();

  // Dynamic theme styling classes for simulated device viewport - aligned to Clean Minimalism
  const themeStyles = {
    slate: {
      bg: 'bg-[#F8FAFC]',
      text: 'text-slate-900',
      accent: 'bg-slate-900 hover:bg-slate-800 active:bg-black text-white',
      border: 'border-slate-100',
      card: 'bg-white border border-slate-100 shadow-sm text-slate-950 rounded-[1.5rem]',
      pillActive: 'bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold',
      pillInactive: 'bg-slate-50 hover:bg-slate-100/60 text-slate-500 border border-slate-200/80',
      statusBar: 'bg-slate-105 text-slate-600',
    },
    violet: {
      bg: 'bg-violet-50/40',
      text: 'text-slate-900',
      accent: 'bg-violet-650 hover:bg-violet-700 active:bg-violet-800 text-white',
      border: 'border-violet-100/85',
      card: 'bg-white border border-violet-100 shadow-sm text-slate-950 rounded-[1.5rem]',
      pillActive: 'bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold',
      pillInactive: 'bg-violet-50/50 hover:bg-violet-100/60 text-violet-700 border border-violet-200/65',
      statusBar: 'bg-violet-100/70 text-violet-700',
    },
    emerald: {
      bg: 'bg-emerald-50/40',
      text: 'text-slate-900',
      accent: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-805 text-white',
      border: 'border-emerald-100/85',
      card: 'bg-white border border-emerald-100 shadow-sm text-slate-950 rounded-[1.5rem]',
      pillActive: 'bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold',
      pillInactive: 'bg-emerald-50/50 hover:bg-emerald-105/65 text-emerald-705 border border-emerald-200/65',
      statusBar: 'bg-emerald-100/70 text-emerald-700',
    }
  }[phoneColor];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-slate-900 selection:text-white pb-16 animate-fade-in">
      
      {/* High-fidelity Clean Minimalist Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 lg:px-12 pt-10 pb-6 border-b border-slate-100 bg-[#F8FAFC]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Fuel className="h-7 w-7 text-slate-900 inline shrink-0" id="app_fuel_icon" />
            FuelMath
          </h1>
          <p className="text-slate-400 text-sm mt-1">Universal fuel price metric converter · Android Viewport</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full text-xs uppercase tracking-wider relative shadow-sm border border-emerald-100/45">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-sync"></span>
            Exchange rates synchronized
          </div>
          <p className="text-slate-400 text-xs text-right">Last updated: {formatLastUpdatedDate(lastUpdated)}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Simulated Android Device Viewport (Span 5) */}
        <section className="lg:col-span-5 flex flex-col items-center">
          
          <div className="w-full max-w-[410px] flex flex-col">
            
            {/* Control panel for Simulated Android Device */}
            <div className="mb-3 flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-slate-650" />
                Simulated Device Frame (Light Theme App)
              </span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setPhoneColor('slate')}
                  className={`w-4 h-4 rounded-full bg-slate-600 border transition-transform ${phoneColor === 'slate' ? 'scale-125 border-slate-400' : 'border-transparent'}`}
                  title="Slate Minimal"
                />
                <button 
                  onClick={() => setPhoneColor('violet')}
                  className={`w-4 h-4 rounded-full bg-violet-500 border transition-transform ${phoneColor === 'violet' ? 'scale-125 border-slate-400' : 'border-transparent'}`}
                  title="Cosmic Indigo"
                />
                <button 
                  onClick={() => setPhoneColor('emerald')}
                  className={`w-4 h-4 rounded-full bg-emerald-500 border transition-transform ${phoneColor === 'emerald' ? 'scale-125 border-slate-400' : 'border-transparent'}`}
                  title="Forest Green"
                />
              </div>
            </div>

            {/* SMARTPHONE CANVAS with light bezel frame matching minimalist aesthetic */}
            <div className={`w-full aspect-[9/18.5] ${themeStyles.bg} rounded-[42px] p-3 shadow-smartphone border-[10px] border-slate-300/90 relative flex flex-col overflow-hidden transition-all duration-500`}>
              
              {/* Speaker & Sensor Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-32 bg-slate-300 rounded-b-2xl z-50 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-400 rounded-full" />
              </div>

              {/* SIMULATED ANDROID STATUS BAR */}
              <div className={`h-8 pt-1.5 px-6 rounded-t-[32px] flex items-center justify-between text-[11px] font-mono select-none z-10 ${themeStyles.statusBar}`}>
                <span>{deviceTime}</span>
                <div className="flex items-center gap-1.5">
                  {simulatedOffline ? (
                    <WifiOff className="h-3.5 w-3.5 text-orange-600" />
                  ) : (
                    <Wifi className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span className="text-[9px] font-semibold tracking-wider">5G</span>
                  {/* Battery */}
                  <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-[1px] flex items-center">
                    <div className="w-[100%] h-full bg-slate-400 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* NATIVE APP INTERIOR */}
              <div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden relative scrollbar-thin scrollbar-thumb-slate-350">
                
                {/* Header inside App */}
                <div className="mt-2 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-250">
                      <Fuel className="h-4 w-4 text-slate-800" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-slate-900">FuelMath App</span>
                  </div>
                  
                  {/* Internal Connection Mode Badge toggle */}
                  <button 
                    onClick={() => setSimulatedOffline(!simulatedOffline)}
                    className={`text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      simulatedOffline 
                        ? 'bg-orange-50 text-orange-700 border-orange-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                    }`}
                  >
                    {simulatedOffline ? 'OFFLINE SIM' : 'ONLINE LIVE'}
                  </button>
                </div>

                {/* Synchronization Status Informational Bar */}
                <div className="mb-4 px-3 py-2 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                    <span className="flex h-2 w-2 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${simulatedOffline ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${simulatedOffline ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                    </span>
                    Rates Synced
                  </span>
                  <span className="font-mono text-slate-700 font-semibold bg-white border border-slate-150 px-2 py-0.5 rounded-md shadow-3xs">
                    {formatLastUpdatedDate(lastUpdated)}
                  </span>
                </div>

                {/* Offline banner check */}
                {simulatedOffline && (
                  <div className="mb-3 px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-2 animate-pulse">
                    <WifiOff className="h-3.5 w-3.5 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-orange-800">Using Capped Caching Rates</p>
                      <p className="text-[9px] text-orange-600/85">Last updated: {formatLastUpdatedDate(lastUpdated)}</p>
                    </div>
                  </div>
                )}

                {/* --- APP SCREEN INPUT BODY --- */}
                <div className="space-y-4">
                  
                  {/* Input Card Container */}
                  <div className={`p-5 rounded-3xl border transition-colors duration-300 ${themeStyles.card}`}>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
                      Enter Fuel Price
                    </label>

                    {/* Clean Light Input text field */}
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 rounded-2xl px-4 py-3.5 text-2xl font-light font-mono text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 select-all transition-all"
                        id="fuel_price_input_android"
                      />
                      
                      {/* Currency / Unit Overlay Indicator */}
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500 uppercase">
                        {CURRENCY_CONFIGS[inputCurrency].symbol} / {UNIT_CONFIGS[inputUnit].symbol}
                      </div>
                    </div>

                    {/* Quick helper adjusters (Satisfying increments for mobile) */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                      <button 
                        onClick={() => {
                          const val = (parseFloat(inputValue) || 0) - 10;
                          setInputValue(Math.max(0, parseFloat(val.toFixed(2))).toString());
                        }}
                        className="py-1.5 text-[10px] bg-slate-55 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 text-slate-700 font-mono font-semibold transition-all"
                      >
                        -10
                      </button>
                      <button 
                        onClick={() => {
                          const val = (parseFloat(inputValue) || 0) - 0.1;
                          setInputValue(Math.max(0, parseFloat(val.toFixed(2))).toString());
                        }}
                        className="py-1.5 text-[10px] bg-slate-55 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 text-slate-700 font-mono font-semibold transition-all"
                      >
                        -0.1
                      </button>
                      <button 
                        onClick={() => {
                          const val = (parseFloat(inputValue) || 0) + 0.1;
                          setInputValue(Math.max(0, parseFloat(val.toFixed(2))).toString());
                        }}
                        className="py-1.5 text-[10px] bg-slate-55 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 text-slate-700 font-mono font-semibold transition-all"
                      >
                        +0.1
                      </button>
                      <button 
                        onClick={() => {
                          const val = (parseFloat(inputValue) || 0) + 10;
                          setInputValue(Math.max(0, parseFloat(val.toFixed(2))).toString());
                        }}
                        className="py-1.5 text-[10px] bg-slate-55 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 text-slate-700 font-mono font-semibold transition-all"
                      >
                        +10
                      </button>
                    </div>

                    {/* SOURCE CURRENCY SELECTOR */}
                    <div className="mt-4">
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                        Source Currency
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.values(CURRENCY_CONFIGS).map((curr) => (
                          <button
                            key={curr.id}
                            onClick={() => {
                              // If setting CAD Cents, default unit is L (standard Canada) over Gallons
                              setInputCurrency(curr.id);
                              if (curr.id === 'CAD_CENTS') {
                                setInputUnit('L');
                              }
                            }}
                            className={`px-2 py-1.5 rounded-xl text-left text-xs flex flex-col justify-between transition-colors ${
                              inputCurrency === curr.id 
                                ? themeStyles.pillActive 
                                : themeStyles.pillInactive
                            }`}
                          >
                            <span className="font-bold text-xs">{curr.symbol} ({curr.id === 'CAD_CENTS' ? '¢' : curr.id})</span>
                            <span className="text-[8px] opacity-80 truncate">{curr.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SOURCE UNIT SELECTOR */}
                    <div className="mt-4">
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                        Source Fuel Unit
                      </span>
                      <div className="flex gap-1.5">
                        {Object.values(UNIT_CONFIGS).map((ut) => (
                          <button
                            key={ut.id}
                            onClick={() => setInputUnit(ut.id)}
                            className={`flex-1 py-1.5 rounded-xl text-center text-xs font-semibold transition-colors ${
                              inputUnit === ut.id 
                                ? themeStyles.pillActive 
                                : themeStyles.pillInactive
                            }`}
                          >
                            {ut.symbol}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* STATUTORY OUTPUT TARGETS COMPLIMENTARY CARD */}
                  <div className={`p-4 rounded-3xl border ${themeStyles.card} space-y-3`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        Primary Target Conversions
                      </span>
                      <Zap className="h-3 w-3 text-emerald-500" />
                    </div>

                    {/* Output 1: USD/U.S. Gallon */}
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Standard U.S. Base</div>
                        <div className="text-[11px] text-slate-700 font-medium">USD per U.S. Gal</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-600">
                          {formatFuelPrice(convertedToUSDPerUSGal, 'USD')}/gal
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          USD / U.S. gal
                        </div>
                      </div>
                    </div>

                    {/* Output 2: CAD/Liter (Whole dollar) */}
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Canada Standard</div>
                        <div className="text-[11px] text-slate-700 font-medium">Canadian Dollar per Liter</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-slate-900">
                          {formatFuelPrice(convertedToCADPerLiter, 'CAD')}/L
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          C$ / Liter
                        </div>
                      </div>
                    </div>

                    {/* Output 3: MXN/Liter */}
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Mexico Base</div>
                        <div className="text-[11px] text-slate-700 font-medium">Mexican Pesos per Liter</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-blue-600">
                          {formatFuelPrice(convertedToMXNPerLiter, 'MXN')}/L
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          Mex$ / Liter
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* APP CUSTOM PLAYGROUND SELECTOR CARD */}
                  <div className={`p-4 rounded-3xl border ${themeStyles.card} space-y-3`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        Custom Dual-Selector
                      </span>
                      <Sliders className="h-3.5 w-3.5 text-slate-500" />
                    </div>

                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      Configure your custom target currency and fuel unit combinations. Change them instantly below.
                    </p>

                    {/* Custom selections selectors inline */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-1">Target Currency</label>
                        <select 
                          value={targetCurrency}
                          onChange={(e) => setTargetCurrency(e.target.value as Currency)}
                          className="w-full text-[11px] bg-[#F8FAFC] text-slate-800 border border-slate-205 rounded-xl p-1.5 font-sans focus:outline-none focus:border-slate-800"
                        >
                          <option value="USD">U.S. Dollar ($)</option>
                          <option value="CAD">Canadian Dollar (C$)</option>
                          <option value="CAD_CENTS">Canadian Cents (¢)</option>
                          <option value="MXN">Mexican Peso (Mex$)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-1">Target Fuel Unit</label>
                        <select 
                          value={targetUnit}
                          onChange={(e) => setTargetUnit(e.target.value as FuelUnit)}
                          className="w-full text-[11px] bg-[#F8FAFC] text-slate-800 border border-slate-205 rounded-xl p-1.5 font-sans focus:outline-none focus:border-slate-800"
                        >
                          <option value="L">Liters (L)</option>
                          <option value="US_GAL">U.S. Gallons</option>
                          <option value="IMP_GAL">Imperial Gallons</option>
                        </select>
                      </div>
                    </div>

                    {/* Standout Custom Result Contrast Block - matching Clean Minimalism */}
                    <div className="bg-slate-900 shadow-sm text-center py-3.5 px-3 rounded-2xl mt-2.5 transition-all">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Custom Conversion Result</div>
                      <div className="text-2xl font-mono font-light text-white mt-1">
                        {formatFuelPrice(customConvertedResult, targetCurrency)}
                        <span className="text-sm font-normal text-slate-400 italic ml-1.5">
                          per {UNIT_CONFIGS[targetUnit].symbol}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* BOTTOM REFRESH COMPONENT INTERNAL */}
                  <div className="text-center pt-1.5">
                    <button 
                      onClick={() => loadRates(true)}
                      disabled={isLoading || simulatedOffline}
                      className={`text-[10px] font-semibold tracking-wide inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-full shadow-xs disabled:opacity-40 transition-all ${isLoading ? 'animate-pulse' : ''}`}
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-blue-400' : 'text-white'}`} />
                      Update Rates Once-Daily Cache
                    </button>
                    <div className="text-[8px] text-slate-400 font-mono mt-1.5">
                      Rate Updated: {formatLastUpdatedDate(lastUpdated)}
                    </div>
                  </div>

                </div>

              </div>

              {/* SIMULATED ANDROID NAVIGATION PILL */}
              <div className="h-6 flex items-center justify-center bg-slate-50 rounded-b-[32px] border-t border-slate-100/60">
                <div className="w-24 h-1 bg-slate-300 rounded-full" />
              </div>

            </div>

          </div>

        </section>

        {/* RIGHT COLUMN: Formula Breakdown, Presets, Settings Console (Span 7) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* 1. INTERACTIVE PRESETS FOR PROVEN TRUTHS - Clean Minimalism style */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-clean-card text-slate-900">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-slate-900" />
              Quick Highway Value Presets
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Click any realistic preset from Canadian, U.S., or Mexican major trans-border corridors to instantly pre-fill the calculator:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CONVERSION_PRESETS.map((preset, index) => {
                const isActive = 
                  inputValue === preset.testVal.toString() && 
                  inputCurrency === preset.fromCurrency && 
                  inputUnit === preset.fromUnit;

                return (
                  <button
                    key={index}
                    onClick={() => applyPreset(preset)}
                    className={`p-4 rounded-2xl text-left border transition-all duration-300 ${
                      isActive 
                        ? 'bg-slate-900 border-transparent text-white shadow-sm scale-[1.02]' 
                        : 'bg-[#F8FAFC] border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-805'
                    }`}
                  >
                    <div className={`font-bold text-xs ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {preset.testVal} {CURRENCY_CONFIGS[preset.fromCurrency].symbol} / {UNIT_CONFIGS[preset.fromUnit].symbol}
                    </div>
                    <div className={`text-[10px] mt-1.5 leading-snug truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {preset.label}
                    </div>
                    <div className={`mt-3.5 text-[10px] font-semibold inline-flex items-center gap-0.5 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                      Load preset <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DYNAMIC STEP-BY-STEP MATHEMATICAL breakdown FORMULAS */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-clean-card text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-4 w-4 text-slate-900" />
                Live Math Expression Builder
              </h2>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                Liters normalize math checks
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Here is the exact step-by-step math showing how 
              <span className="text-slate-900 font-mono font-bold mx-1">
                {numericPrice} {CURRENCY_CONFIGS[inputCurrency].symbol}/{UNIT_CONFIGS[inputUnit].symbol}
              </span>
              translates globally under active currency coefficients and standard liquid weights:
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-100/90 font-mono text-[11px] text-slate-700 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Normalized Step Flow</div>
                <div className="leading-relaxed">{steps.step1Explanation}</div>
                <div className="leading-relaxed mt-2 pt-2 border-t border-slate-200/60">{steps.step2Explanation}</div>
                <div className="leading-relaxed mt-2 pt-2 border-t border-slate-200/60">{steps.step3Explanation}</div>
              </div>

              {/* Target Results math formulas (What the user requested) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Statutory Output Verification
                </div>
                <div className="text-[11px] font-mono space-y-2 text-slate-700">
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">U.S. Conversion Formula:</p>
                    {steps.stepUSDGalExplanation}
                  </div>
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">Mexican Conversion Formula:</p>
                    {steps.stepMXNLitExplanation}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BROAD CONVERSION COMPARATIVE MATRIX (All 12 combinations) - Clean Minimalism Style */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-clean-card space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Grid className="h-4 w-4 text-slate-900" />
                  Comparative Fuel Matrix
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Shows the active value transformed into all currencies and volumetric capacities simultaneously.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-[#F8FAFC]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-150">
                    <th className="p-4 font-semibold">Currency Option</th>
                    <th className="p-4 font-semibold">Per Liter (L)</th>
                    <th className="p-4 font-semibold">Per U.S. Gallon</th>
                    <th className="p-4 font-semibold">Per Imperial Gallon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-mono text-[11px] text-slate-800">
                  
                  {/* Row USD */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-sans font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      U.S. Dollar ($)
                    </td>
                    <td className="p-4 text-emerald-600 font-medium">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'USD', 'L', activeRates), 'USD')}
                    </td>
                    <td className="p-4 text-emerald-700 font-bold">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'USD', 'US_GAL', activeRates), 'USD')}
                    </td>
                    <td className="p-4 text-emerald-600">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'USD', 'IMP_GAL', activeRates), 'USD')}
                    </td>
                  </tr>

                  {/* Row CAD Dollars */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-sans font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1e293b]" />
                      Canadian Dollar (C$)
                    </td>
                    <td className="p-4 text-slate-900 font-bold">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'CAD', 'L', activeRates), 'CAD')}
                    </td>
                    <td className="p-4 text-slate-800 font-semibold">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'CAD', 'US_GAL', activeRates), 'CAD')}
                    </td>
                    <td className="p-4 text-slate-600">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'CAD', 'IMP_GAL', activeRates), 'CAD')}
                    </td>
                  </tr>

                  {/* Row CAD Cents */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-sans text-slate-500 flex items-center gap-1.5 pl-6">
                      <span className="text-[10px] text-slate-400">➥</span> Canadian Cents (¢)
                    </td>
                    <td className="p-4 text-slate-500">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'CAD_CENTS', 'L', activeRates), 'CAD_CENTS')}
                    </td>
                    <td className="p-4 text-slate-500">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'CAD_CENTS', 'US_GAL', activeRates), 'CAD_CENTS')}
                    </td>
                    <td className="p-4 text-slate-400">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'CAD_CENTS', 'IMP_GAL', activeRates), 'CAD_CENTS')}
                    </td>
                  </tr>

                  {/* Row Mexican Pesos */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-sans font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Mexican Peso (Mex$)
                    </td>
                    <td className="p-4 text-amber-600 font-bold">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'MXN', 'L', activeRates), 'MXN')}
                    </td>
                    <td className="p-4 text-amber-600 font-medium">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'MXN', 'US_GAL', activeRates), 'MXN')}
                    </td>
                    <td className="p-4 text-amber-500">
                      {formatFuelPrice(convertFuelPrice(numericPrice, inputCurrency, inputUnit, 'MXN', 'IMP_GAL', activeRates), 'MXN')}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* 4. REVOLUTIONARY SANDBOX EXCHANGE RATE CONSOLE - Clean Minimalism Style */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-clean-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="h-4.5 w-4.5 text-slate-900" />
                  Forex Coefficient Settings
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  View default once-daily rates or toggle Sandbox mode to force custom exchange coefficients.
                </p>
              </div>

              {/* Toggle sandbox */}
              <button
                onClick={() => setIsSandboxMode(!isSandboxMode)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  isSandboxMode 
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-xs' 
                    : 'bg-[#F8FAFC] hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {isSandboxMode ? (
                  <>
                    <LockOpen className="h-3 w-3" />
                    Sandbox Override Active
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Lock Live Rates
                  </>
                )}
              </button>
            </div>

            {/* Simulated Rate Stats Slider display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* CAD Card Slider */}
              <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-slate-100/95 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="font-bold flex items-center gap-1">
                    🇨🇦 CAD / USD rate
                  </span>
                  <span className="font-mono text-slate-900 font-extrabold bg-white px-2.5 py-1 rounded border border-slate-200">
                    1 USD = {isSandboxMode ? sandboxCad.toFixed(4) : rates.CAD.toFixed(4)} CAD
                  </span>
                </div>
                
                {isSandboxMode ? (
                  <div className="space-y-1.5 pt-1.5">
                    <input 
                      type="range" 
                      min="1.00" 
                      max="2.00" 
                      step="0.001"
                      value={sandboxCad}
                      onChange={(e) => setSandboxCad(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>1.00 USD Parity</span>
                      <span>2.00 USD CAD Peak</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Live source current rate cached securely. Unlock sandbox above to modify coefficients here.
                  </p>
                )}
              </div>

              {/* MXN Card Slider */}
              <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-slate-100/95 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="font-bold flex items-center gap-1">
                    🇲🇽 MXN / USD rate
                  </span>
                  <span className="font-mono text-slate-900 font-extrabold bg-white px-2.5 py-1 rounded border border-slate-200">
                    1 USD = {isSandboxMode ? sandboxMxn.toFixed(4) : rates.MXN.toFixed(4)} MXN
                  </span>
                </div>

                {isSandboxMode ? (
                  <div className="space-y-1.5 pt-1.5">
                    <input 
                      type="range" 
                      min="15.00" 
                      max="25.00" 
                      step="0.01"
                      value={sandboxMxn}
                      onChange={(e) => setSandboxMxn(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>15.00 MXN / USD</span>
                      <span>25.00 MXN / USD</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Live source current rate cached securely. Unlock sandbox above to modify coefficients here.
                  </p>
                )}
              </div>

            </div>

            {isSandboxMode && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setSandboxCad(rates.CAD);
                    setSandboxMxn(rates.MXN);
                    setIsSandboxMode(false);
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1.5 bg-[#F8FAFC] px-3.5 py-1.5 rounded-xl border border-slate-200 transition-colors font-semibold"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to Live Cache rates
                </button>
              </div>
            )}
          </div>

          {/* 5. APP ACCESSIBILITY / INFO BOX */}
          <div className="p-6 bg-[#F8FAFC] border border-slate-200/60 rounded-[2rem] flex items-start gap-4">
            <div className="p-2.5 bg-slate-900 rounded-xl text-white shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                Automated Caching Mechanics
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                This app runs offline-safe! It automatically caches the once-daily converted exchange factors upon first launch and will refresh rates safely only when the internet is active. Dates are parsed in standard UTC format with a prominent label identifying local refresh states.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-slate-900" />
                  1 U.S. Gallon = 3.78541 Liters
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-slate-900" />
                  1 Imperial Gallon = 4.54609 Liters
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-slate-900" />
                  Canadian Cents Subunit Division
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-slate-900" />
                  MacBook M2 layout-optimized
                </div>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* Footer copyright */}
      <footer className="max-w-7xl mx-auto px-6 mt-20 text-center text-xs text-slate-450 border-t border-slate-100 pt-8 pb-12">
        <p className="font-medium text-slate-600">Fuel Price Converter • Premium Material You Interoperable Simulated Android Sandbox Environment.</p>
        <p className="mt-1 text-[10px] text-slate-400 font-light">Built with React, Vite, and tailwindcss. Running in secure containerized sandboxes.</p>
      </footer>

    </div>
  );
}
